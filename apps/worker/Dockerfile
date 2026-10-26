FROM golang:1.27.3-bookworm AS build
WORKDIR /source
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG TARGETOS=linux
ARG TARGETARCH=arm64
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -tags lambda.norpc -ldflags='-s -w' -o /out/bootstrap ./cmd/worker
RUN cd /out && sha256sum bootstrap > bootstrap.sha256
FROM scratch AS artifact
COPY --from=build /out/bootstrap /bootstrap
COPY --from=build /out/bootstrap.sha256 /bootstrap.sha256
FROM gcr.io/distroless/static-debian12:nonroot AS runtime
WORKDIR /app
COPY --from=build /out/bootstrap ./bootstrap
ENTRYPOINT ["/app/bootstrap"]
CMD ["--demo", "--topic", "Cache Aside", "--output", "/tmp/techcanvas-pack"]
