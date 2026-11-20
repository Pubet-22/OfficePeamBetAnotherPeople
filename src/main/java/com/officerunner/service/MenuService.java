package com.officerunner.service;

import com.officerunner.common.ApiException;
import com.officerunner.domain.CoffeeMenu;
import com.officerunner.repository.CoffeeMenuRepository;
import com.officerunner.web.dto.MenuRequest;
import com.officerunner.web.dto.MenuResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final CoffeeMenuRepository repo;

    @Transactional(readOnly = true)
    public List<MenuResponse> list(boolean includeUnavailable) {
        var menus = includeUnavailable ? repo.findAllByOrderBySortOrderAscIdAsc() : repo.findByAvailableTrueOrderBySortOrderAscIdAsc();
        return menus.stream().map(MenuResponse::from).toList();
    }

    @Transactional
    public MenuResponse create(MenuRequest r) {
        CoffeeMenu m = new CoffeeMenu();
        apply(m, r);
        return MenuResponse.from(repo.save(m));
    }

    @Transactional
    public MenuResponse update(Long id, MenuRequest r) {
        CoffeeMenu m = repo.findById(id).orElseThrow(() -> ApiException.notFound("Menu"));
        apply(m, r);
        return MenuResponse.from(m);
    }

    private static void apply(CoffeeMenu m, MenuRequest r) {
        if (!r.allowHot() && !r.allowIced()) {
            throw ApiException.badRequest("INVALID_MENU", "At least one of allowHot / allowIced must be true");
        }
        m.setName(r.name());
        m.setDescription(r.description());
        m.setPrice(r.price());
        m.setAllowHot(r.allowHot());
        m.setAllowIced(r.allowIced());
        m.setImageUrl(r.imageUrl());
        m.setAvailable(r.available());
        m.setSortOrder(r.sortOrder() == null ? 0 : r.sortOrder());
    }
}
