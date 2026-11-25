package se.pourfolio.category;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    @Query("select c from Category c order by c.sortOrder, c.name")
    List<Category> findAllOrdered();

    @Query("select c.id from Category c where c.parent.id = :parentId")
    List<Long> findChildIds(Long parentId);

    @Query("select count(c) > 0 from Category c where c.parent.id = :parentId")
    boolean hasChildren(Long parentId);
}
