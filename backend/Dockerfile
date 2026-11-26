# Build: docker build -t pourfolio-backend backend
# Run:   docker run -p 8080:8080 -e DATABASE_URL=jdbc:postgresql://host:5432/pourfolio \
#          -e DATABASE_USERNAME=... -e DATABASE_PASSWORD=... \
#          -e AUTH_USERNAME=... -e AUTH_PASSWORD=... -e AUTH_TOKEN_SECRET=... pourfolio-backend

FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
# Resolve dependencies in their own layer so code changes don't re-download them.
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN sh ./mvnw -B -q dependency:go-offline
COPY src src
# Extract to a plain classpath (app.jar + lib/) instead of the nested "fat jar":
# Class Data Sharing (below) only works with a plain classpath.
RUN sh ./mvnw -B -q package -DskipTests \
    && java -Djarmode=tools -jar target/pourfolio-backend-*.jar extract \
        --layers --application-filename app.jar --destination target/extracted

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 pourfolio
# Dependencies change rarely; keep them in their own image layer.
COPY --from=build /workspace/target/extracted/dependencies/ ./
COPY --from=build /workspace/target/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/target/extracted/application/ ./

# Startup tuning for small instances (e.g. Render's free tier with a fraction of a CPU):
# - SerialGC: the simplest collector, no extra GC threads.
# - TieredStopAtLevel=1: only the quick C1 compiler; much less CPU spent compiling at
#   startup, at the cost of some peak performance this app doesn't need.
ENV JAVA_TOOL_OPTIONS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:MaxRAMPercentage=75"

# Class Data Sharing training run: start the application context once (without a
# database) and save the loaded classes to app.jsa, so real starts can skip loading and
# verifying them. Must use the same JVM, classpath and flags as the real start.
RUN java -XX:ArchiveClassesAtExit=app.jsa \
        -Dspring.context.exit=onRefresh \
        -Dspring.flyway.enabled=false \
        -Dspring.jpa.hibernate.ddl-auto=none \
        -Dspring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access=false \
        -Dspring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect \
        -Dpourfolio.auth.username=cds-training \
        -Dpourfolio.auth.password=cds-training \
        -Dpourfolio.auth.token-secret=cds-training-secret-not-used-at-runtime \
        -jar app.jar

USER pourfolio
# Hosting platforms usually provide PORT; defaults to 8080.
EXPOSE 8080
ENTRYPOINT ["java", "-XX:SharedArchiveFile=app.jsa", "-jar", "app.jar"]
