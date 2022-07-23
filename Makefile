MULTI_ARCH_AVAILABLE := $(shell docker buildx inspect | grep amd64 | grep arm64 > /dev/null 2>&1; echo $$?)

.PHONY: packageDocker publishDocker

default: packageDocker

packageDocker:
ifeq ($(MULTI_ARCH_AVAILABLE), 0)
	docker buildx build -o type="image,push=false" --platform linux/amd64,linux/arm64 --tag asciidoctor/web-pdf:latest .
else
	docker build -t asciidoctor/web-pdf .
endif

testDocker:
	echo "= Test" | docker run -i asciidoctor/web-pdf:latest -a reproducible - > test/output/docker-smoke-test.pdf
	md5sum -c test/docker-smoke-test.md5sum

publishDocker:
ifndef RELEASE_VERSION
	$(error RELEASE_VERSION is undefined)
endif
	docker buildx build --push --platform linux/amd64,linux/arm64 --tag asciidoctor/web-pdf:latest --tag asciidoctor/web-pdf:${RELEASE_VERSION} .
