package engine

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"unicode/utf8"
)

func (w *Worker) refineImageJob(ctx context.Context, m Message, job Item) error {
	refiner, ok := w.Images.(ImageRefiner)
	source, canRead := w.Assets.(ImageSource)
	parentID, idOK := job["parentId"].(string)
	instructions, textOK := job["refinementInstructions"].(string)
	fail := func() error {
		return w.finish(ctx, m, "failed", "queued", Item{"error": "Refinement source, instructions or provider unavailable. No model call was made."})
	}
	if !ok || !canRead || !idOK || !JobID.MatchString(parentID) || parentID == m.ID || !textOK || len(instructions) < 3 || len(instructions) > 600 || !utf8.ValidString(instructions) || strings.ContainsAny(instructions, "\x00\r\n") || job["generateImage"] != true {
		return fail()
	}
	parent, err := w.Repo.Get(ctx, "OWNER#"+m.Owner, "JOB#"+parentID)
	if err != nil {
		return err
	}
	if parent == nil || parent["status"] != "completed" || parent["imageStatus"] != "completed" || parent["topic"] != job["topic"] || number(parent["assetRevision"]) != number(job["parentRevision"]) {
		return fail()
	}
	encoded, err := json.Marshal(parent["content"])
	if err != nil {
		return fail()
	}
	var content Content
	if json.Unmarshal(encoded, &content) != nil || Validate(content) != nil {
		return fail()
	}
	topic, _ := job["topic"].(string)
	brief, err := ImageBrief(topic, content)
	if builder, yes := w.Images.(ImageBriefBuilder); yes && err == nil {
		brief, err = builder.BuildBrief(topic, content)
	}
	if err != nil {
		return fail()
	}
	// Claim a distinct child job without calling or charging the text model again.
	claimed := false
	err = w.retry(func() error {
		claimed = false
		before, e := w.Repo.Get(ctx, "OWNER#"+m.Owner, "JOB#"+m.ID)
		if e != nil {
			return e
		}
		if before == nil || before["status"] != "queued" || number(before["revision"]) != int64(m.Revision) {
			return nil
		}
		next := copyItem(before)
		next["status"] = "running"
		next["leaseUntil"] = w.now().Add(3 * time.Minute).UnixMilli()
		e = w.Repo.Commit(ctx, []Change{{"OWNER#" + m.Owner, "JOB#" + m.ID, before, next}})
		claimed = e == nil
		return e
	})
	if err != nil {
		return err
	}
	if !claimed {
		return nil
	}
	raw, _ := encode(content)
	var stored map[string]any
	_ = json.Unmarshal(raw, &stored)
	files, err := Render(topic, content, w.Demo)
	if err == nil {
		err = w.Assets.Put(ctx, m.Owner, m.ID, m.Revision, files)
	}
	if err != nil {
		return w.finish(ctx, m, "failed", "running", Item{"error": "Could not save refinement text pack. No image model call was made."})
	}
	if err = w.checkpointText(ctx, m, stored); err != nil {
		return err
	}
	extra := Item{"content": stored, "assetRevision": m.Revision, "imageStatus": "failed"}
	err = func() error {
		previous, e := source.LoadImage(ctx, m.Owner, parentID, int(number(job["parentRevision"])))
		if e != nil {
			return e
		}
		if e = ValidatePNG(previous); e != nil {
			return e
		}
		if e = w.reserveImage(ctx, m); e != nil {
			return e
		}
		var usage *ImageUsage
		body, e := refiner.Refine(WithImageUsage(ctx, func(u ImageUsage) { usage = &u }), brief, previous, instructions)
		if usage != nil {
			if saveErr := w.saveImageUsage(ctx, m, *usage); saveErr != nil {
				return saveErr
			}
		}
		if e != nil {
			return e
		}
		if e = ValidatePNG(body); e != nil {
			return e
		}
		sink, yes := w.Assets.(ImageAssets)
		if !yes {
			return errors.New("image storage unavailable")
		}
		return sink.PutImage(ctx, m.Owner, m.ID, m.Revision, body)
	}()
	if err != nil {
		extra["imageError"] = "Refinement failed or quota exhausted. The original image is unchanged; any reserved image attempt remains counted. No automatic retry."
	} else {
		extra["imageStatus"] = "completed"
	}
	return w.finish(ctx, m, "completed", "running", extra)
}
