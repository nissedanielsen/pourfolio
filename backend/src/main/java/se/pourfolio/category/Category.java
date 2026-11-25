package se.pourfolio.category;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * A node in the fixed two-level category tree. Categories are seeded by Flyway
 * migrations and are read-only from the application's point of view.
 */
@Entity
@Table(name = "category")
public class Category {

    @Id
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    private String code;

    private String name;

    private int sortOrder;

    protected Category() {
    }

    public Long getId() {
        return id;
    }

    public Category getParent() {
        return parent;
    }

    public Long getParentId() {
        return parent == null ? null : parent.getId();
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public boolean isTopLevel() {
        return parent == null;
    }
}
