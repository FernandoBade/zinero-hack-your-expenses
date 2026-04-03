// @vitest-environment jsdom

import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Button } from "@/components/button/button";

describe("Button", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        render(null, container);
        container.remove();
    });

    it("keeps content visible and swaps Daisy spinner for a phosphor spinner while loading", () => {
        const onClick = vi.fn();

        render(
            <Button loading onClick={onClick}>
                Finalizar cadastro
            </Button>,
            container
        );

        const button = container.querySelector("button");

        expect(button?.getAttribute("aria-busy")).toBe("true");
        expect(button?.textContent).toContain("Finalizar cadastro");
        expect(container.querySelector(".loading-spinner")).toBeNull();
        expect(container.querySelector("svg")).not.toBeNull();

        button?.click();

        expect(onClick).not.toHaveBeenCalled();
    });
});
