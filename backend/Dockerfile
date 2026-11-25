# Build: docker build -t pourfolio-backend backend
# Run:   docker run -p 8080:8080 -e DATABASE_URL=jdbc:postgresql://host:5432/pourfolio \
#          -e DATABASE_USERNAME=... -e DATABASE_PASSWORD=... pourfolio-backend

FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
# Resolve dependencies in their own layer so code changes don't re-download them.
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN sh ./mvnw -B -q dependency:go-offline
COPY src src
RUN sh ./mvnw -B -q package -DskipTests \
    && java -Djarmode=tools -jar target/pourfolio-backend-*.jar extract --layers --launcher --destination target/extracted

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 pourfolio
COPY --from=build /workspace/target/extracted/dependencies/ ./
COPY --from=build /workspace/target/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/target/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/target/extracted/application/ ./
USER pourfolio
# Hosting platforms usually provide PORT; defaults to 8080.
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "org.springframework.boot.loader.launch.JarLauncher"]
