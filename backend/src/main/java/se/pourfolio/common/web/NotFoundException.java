package se.pourfolio.common.web;

/** Thrown when a requested resource does not exist; mapped to 404. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String resource, Object id) {
        super(resource + " with id " + id + " was not found");
    }
}
