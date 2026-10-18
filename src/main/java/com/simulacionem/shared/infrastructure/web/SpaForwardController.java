package com.simulacionem.shared.infrastructure.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    // Rutas del cliente (React Router) sin extensión y fuera de /api y /assets → index.html.
    // /assets queda excluido porque el build de Vite sirve ahí los .js y .css: si cayeran aquí, el navegador
    // recibiría HTML en lugar de JavaScript y la pantalla quedaría en blanco.
    @GetMapping({"/{path:^(?!api$|assets$)[^\\.]*}", "/{path:^(?!api$|assets$)[^\\.]*}/**"})
    public String forward() {
        return "forward:/index.html";
    }
}
