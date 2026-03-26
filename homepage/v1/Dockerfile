# Build
FROM golang:1.25.2-alpine3.22 AS build
WORKDIR /app
COPY . .
RUN go build -o homepage.elf main.go

# Runtime
FROM alpine:latest AS runtime
WORKDIR /app
COPY --from=build /app/homepage.elf .

ENV HTTP_ADDRESS="0.0.0.0:8080"
EXPOSE 8080

CMD ["./homepage.elf"]