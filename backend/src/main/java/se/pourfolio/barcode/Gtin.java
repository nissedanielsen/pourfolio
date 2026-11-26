package se.pourfolio.barcode;

import java.util.Optional;

/**
 * GTIN barcodes (EAN-8, UPC-A, EAN-13, GTIN-14): 8, 12, 13 or 14 digits where the last is a
 * check digit. Validating the check digit catches most misreads and typos.
 */
public final class Gtin {

    private Gtin() {
    }

    /** The barcode with spaces removed if it is a valid GTIN, otherwise empty. */
    public static Optional<String> normalize(String input) {
        if (input == null) {
            return Optional.empty();
        }
        String digits = input.replace(" ", "");
        return isValid(digits) ? Optional.of(digits) : Optional.empty();
    }

    public static boolean isValid(String digits) {
        if (digits == null || !digits.matches("\\d{8}|\\d{12,14}")) {
            return false;
        }
        return checkDigit(digits.substring(0, digits.length() - 1)) == digits.charAt(digits.length() - 1) - '0';
    }

    /** The check digit for the given digits (all but the last of a GTIN). */
    static int checkDigit(String body) {
        int sum = 0;
        // Weights alternate 3, 1, 3, ... starting from the rightmost digit of the body.
        for (int i = 0; i < body.length(); i++) {
            int digit = body.charAt(body.length() - 1 - i) - '0';
            sum += digit * (i % 2 == 0 ? 3 : 1);
        }
        return (10 - sum % 10) % 10;
    }
}
