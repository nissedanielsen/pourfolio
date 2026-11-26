package se.pourfolio.barcode;

import org.springframework.data.jpa.repository.JpaRepository;

public interface KnownProductRepository extends JpaRepository<KnownProduct, String> {
}
