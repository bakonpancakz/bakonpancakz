# Build
FROM golang:1.25.2-alpine3.22 AS build
WORKDIR /app
COPY . .
RUN go build -o homepage.elf main.go
#RUN touch homepage.elf

# Runtime
FROM alpine:latest AS runtime
WORKDIR /app
COPY --from=build /app/homepage.elf .
COPY --from=build /app/templates    ./templates
COPY --from=build /app/public       ./public

ENV HTTP_ADDRESS="0.0.0.0:8080"
EXPOSE 8080

CMD ["./homepage.elf"]
