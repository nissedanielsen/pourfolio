package se.pourfolio.barcode;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import tools.jackson.databind.JsonNode;

/**
 * Looks up barcodes in Open Food Facts (open, crowd-sourced product data, ODbL). Only the
 * barcode is sent. Identifies itself with a generic app name as their API asks.
 */
@Component
public class OpenFoodFactsClient {

    private static final Logger log = LoggerFactory.getLogger(OpenFoodFactsClient.class);
    private static final String FIELDS =
            "code,product_name,product_name_sv,product_name_en,brands,quantity,nutriments,categories_tags";

    /** Open Food Facts could not be reached or answered with an error. */
    public static class UnavailableException extends RuntimeException {
        UnavailableException(Throwable cause) {
            super("Open Food Facts is unavailable", cause);
        }
    }

    private final RestClient rest;
    private final boolean enabled;

    public OpenFoodFactsClient(
            @Value("${pourfolio.open-food-facts.base-url}") String baseUrl,
            @Value("${pourfolio.open-food-facts.enabled}") boolean enabled) {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.rest = RestClient.builder().baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader("User-Agent", "Pourfolio/1.0 (personal drinks inventory)")
                .build();
        this.enabled = enabled;
    }

    public boolean isEnabled() {
        return enabled;
    }

    /**
     * @return the product, or empty if Open Food Facts doesn't know the barcode (or lookups are disabled)
     * @throws UnavailableException if the service can't be reached
     */
    public Optional<OpenFoodFactsProduct> lookup(String barcode) {
        if (!enabled) {
            return Optional.empty();
        }
        try {
            JsonNode response = rest.get()
                    .uri("/api/v2/product/{barcode}.json?fields={fields}", barcode, FIELDS)
                    .retrieve()
                    .body(JsonNode.class);
            return OpenFoodFactsProduct.fromResponse(response);
        } catch (RestClientException e) {
            log.warn("Open Food Facts lookup failed: {}", e.getMessage());
            throw new UnavailableException(e);
        }
    }
}
