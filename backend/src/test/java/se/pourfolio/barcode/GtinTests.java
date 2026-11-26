package se.pourfolio.barcode;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GtinTests {

    @Test
    void acceptsValidBarcodes() {
        assertThat(Gtin.isValid("7312040017010")).isTrue(); // EAN-13, Absolut Vodka
        assertThat(Gtin.isValid("5010327755014")).isTrue(); // EAN-13, Hendrick's
        assertThat(Gtin.isValid("96385074")).isTrue();      // EAN-8
        assertThat(Gtin.isValid("036000291452")).isTrue();  // UPC-A
    }

    @Test
    void rejectsWrongCheckDigitAndLength() {
        assertThat(Gtin.isValid("7312040017011")).isFalse();
        assertThat(Gtin.isValid("731204001701")).isFalse();
        assertThat(Gtin.isValid("12345")).isFalse();
        assertThat(Gtin.isValid("73120400170A0")).isFalse();
        assertThat(Gtin.isValid(null)).isFalse();
    }

    @Test
    void normalizesSpaces() {
        assertThat(Gtin.normalize("7312040 017010")).contains("7312040017010");
        assertThat(Gtin.normalize("nope")).isEmpty();
    }

    @Test
    void computesCheckDigit() {
        assertThat(Gtin.checkDigit("731204001701")).isZero();
        assertThat(Gtin.checkDigit("501032775501")).isEqualTo(4);
    }
}
