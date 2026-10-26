# Runtime, Docker builds and the Go worker

One repository does not require one runtime or one deployment. The system currently runs like this:

| Component | Current AWS hosting | Docker role |
| --- | --- | --- |
| Portfolio | Node.js HTTP server in Lambda Web Functions, behind CloudFront | apps/portfolio/aws/Dockerfile.build builds its Linux ZIP; apps/portfolio/Dockerfile optionally runs it locally |
| Portfolio API | NestJS HTTP server in Lambda Web Functions | apps/api/aws/Dockerfile.build builds its Linux ZIP; apps/api/Dockerfile optionally runs it locally |
| TechCanvas UI | Private static S3 files through CloudFront | No production container; apps/techcanvas/Dockerfile runs the local curated-demo server only |
| Studio API/dispatcher/current worker | Bundled Node.js Lambda Event Functions; processing remains disabled | Bundling does not require runtime container hosting |
| New Go worker | Implemented/tested locally; opt-in Lambda provided.al2023 binary path prepared, not deployed | apps/worker/Dockerfile builds the Linux ARM64 bootstrap and can run a local demo container |

The root has no application Dockerfile because it is an orchestration repository, not one server. Dockerfiles are next to their corresponding apps. The .build Dockerfiles end in scratch artifact stages: they export files for Lambda ZIP deployment. They do not create running production containers.

Lambda provides managed execution environments; we do not operate an ECS/EKS/EC2 Docker fleet. Static files do not need a server container. The Go binary uses the Lambda OS-only provided runtime and AWS Lambda's Go event library; it cannot be placed in the Node-only Web Functions runtime.

The worker's role is asynchronous content generation/rendering behind the queue, where it shares a clear message and storage contract with the Node API/dispatcher. It does not replace NestJS, change owner logins or introduce a separate repository. Production selection stays Node unless explicitly reviewed; neither processing nor paid inference has been activated.

Local runtime images are conveniences, not a production migration. Publish local ports on host loopback, supply private runtime environment files explicitly and keep .env out of build contexts. Example portfolio container:

```sh
docker build -t portfolio:local apps/portfolio
docker run --rm -p 127.0.0.1:3000:3000 portfolio:local
```

For the API, provide its required private owner/database configuration and publish port 4000 on loopback. Its explicit listen-address variable is reused inside the container; it does not imply AWS is running locally. The studio container deliberately uses curated demo mode and no cloud credentials. Go's Docker demo runs once and exits; its generated files are temporary unless copied out. Use pnpm demo:worker for persistent local review files.

Primary sources:
- https://docs.aws.amazon.com/lambda/latest/dg/web-functions-runtimes.html
- https://docs.aws.amazon.com/lambda/latest/dg/golang-package.html
- https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/configure-retries-timeouts.html
