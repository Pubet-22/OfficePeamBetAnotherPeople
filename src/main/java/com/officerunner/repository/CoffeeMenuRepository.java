package com.officerunner.repository;

import com.officerunner.domain.CoffeeMenu;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CoffeeMenuRepository extends JpaRepository<CoffeeMenu, Long> {
    List<CoffeeMenu> findAllByOrderBySortOrderAscIdAsc();

    List<CoffeeMenu> findByAvailableTrueOrderBySortOrderAscIdAsc();
}
