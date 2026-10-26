package engine

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"strings"
)

var AssetNames = []string{"blog.md", "summary.svg", "memory.svg", "portfolio.json", "caption.txt", "concept-1.svg", "concept-2.svg", "concept-3.svg"}

func escaped(s string) string {
	var b bytes.Buffer
	_ = xml.EscapeText(&b, []byte(s))
	return b.String()
}
func wrapped(s string, width, max int) []string {
	var lines []string
	line := ""
	for _, word := range strings.Fields(s) {
		for len([]rune(word)) > width {
			if line != "" {
				lines = append(lines, line)
				line = ""
			}
			r := []rune(word)
			lines = append(lines, string(r[:width]))
			word = string(r[width:])
		}
		if len([]rune(strings.TrimSpace(line+" "+word))) > width && line != "" {
			lines = append(lines, line)
			line = word
		} else {
			line = strings.TrimSpace(line + " " + word)
		}
	}
	if line != "" {
		lines = append(lines, line)
	}
	if len(lines) > max {
		lines = lines[:max]
		lines[max-1] += "…"
	}
	return lines
}
func text(s string, x, y, size, width, max int, color string) string {
	out := fmt.Sprintf(`<text fill="%s" font-family="Arial,sans-serif" font-size="%d" x="%d" y="%d">`, color, size, x, y)
	for i, line := range wrapped(s, width, max) {
		dy := 0
		if i > 0 {
			dy = size * 14 / 10
		}
		out += fmt.Sprintf(`<tspan x="%d" dy="%d">%s</tspan>`, x, dy, escaped(line))
	}
	return out + "</text>"
}
func svg(topic string, c Content, index int, memory bool, label string) string {
	out := `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="#111429"/><circle cx="1030" cy="40" r="300" fill="#292451"/>`
	heading := "TECHCANVAS / CONCEPT NOTES"
	if memory {
		heading = "TECHCANVAS / REMEMBER THE FLOW"
	}
	out += text(heading, 70, 85, 22, 70, 1, "#b2a4ff") + text(topic, 70, 170, 52, 29, 3, "#f4f4ff")
	cards := c.Concepts
	if index >= 0 {
		cards = []Concept{c.Concepts[index]}
	}
	for i, card := range cards {
		y := 355 + i*190
		number := i + 1
		if index >= 0 {
			number = index + 1
		}
		out += fmt.Sprintf(`<rect x="65" y="%d" width="950" height="160" rx="20" fill="#20253e"/>`, y-42) + text(fmt.Sprintf("%02d", number), 90, y, 25, 4, 1, "#ae9cff") + text(card.Title, 155, y, 28, 46, 2, "#f4f4ff") + text(card.Body, 155, y+58, 22, 62, 2, "#cad0e5")
		if memory && i < len(cards)-1 {
			out += fmt.Sprintf(`<path d="M540 %d L540 %d M528 %d L540 %d L552 %d" stroke="#ae9cff" stroke-width="4" fill="none"/>`, y+122, y+145, y+133, y+145, y+133)
		}
	}
	if index >= 0 {
		out += text(c.Sentence, 85, 640, 30, 48, 5, "#cad0e5")
	}
	return out + text(label+" • Review before publishing", 70, 1020, 20, 80, 1, "#9aa5c2") + "</svg>"
}
func Render(topic string, c Content, demo bool) (map[string]string, error) {
	if err := Validate(c); err != nil {
		return nil, err
	}
	label := "Cloud AI draft"
	if demo {
		label = "Curated demo"
	}
	md := Markdown(topic, c)
	post, err := encode(struct {
		Title   string   `json:"title"`
		Summary string   `json:"summary"`
		Body    string   `json:"content_markdown"`
		Tags    []string `json:"tags"`
		Status  string   `json:"status"`
	}{topic, c.Paragraph, md, []string{"techcanvas"}, "draft"})
	if err != nil {
		return nil, err
	}
	files := map[string]string{"blog.md": md, "summary.svg": svg(topic, c, -1, false, label), "memory.svg": svg(topic, c, -1, true, label), "portfolio.json": string(post), "caption.txt": c.Sentence + "\n\n" + c.Paragraph + "\n\n#SoftwareEngineering #TechCanvas"}
	for i := range c.Concepts {
		files[fmt.Sprintf("concept-%d.svg", i+1)] = svg(topic, c, i, false, label)
	}
	return files, nil
}
