# syntax=docker/dockerfile:1

# Etapa 1: compilar el frontend (React + Vite) con la misma versión de Node que el pom (v22).
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Etapa 2: compilar el backend (Spring Boot) con el frontend ya compilado dentro de static/.
FROM eclipse-temurin:21-jdk-alpine AS backend
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN sh ./mvnw -B -DskipFrontend dependency:go-offline
COPY src/ src/
COPY --from=frontend /app/frontend/dist/ src/main/resources/static/
RUN sh ./mvnw -B -DskipFrontend -DskipTests package

# Etapa 3: imagen final, solo el JRE y el jar. Sin código fuente, sin Maven, sin Node.
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S -G app app
COPY --from=backend /app/target/*.jar /app/app.jar
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70"
USER app
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
