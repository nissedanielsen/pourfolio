package se.pourfolio.barcode;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/api/barcodes", produces = MediaType.APPLICATION_JSON_VALUE)
public class BarcodeController {

    private final BarcodeLookupService service;

    public BarcodeController(BarcodeLookupService service) {
        this.service = service;
    }

    /** What is known about a scanned EAN/GTIN barcode. An invalid barcode gives 400. */
    @GetMapping("/{barcode}")
    public BarcodeLookupResponse lookup(@PathVariable String barcode) {
        return service.lookup(barcode);
    }
}
