package se.pourfolio.common.web;

/** Thrown when a request is well-formed but breaks a business rule; mapped to 400. */
public class InvalidRequestException extends RuntimeException {

    private final String field;

    public InvalidRequestException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
