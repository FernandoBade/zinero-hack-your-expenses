import { render } from "preact";
import { App } from "@/App";
import { bootstrapApp } from "@/bootstrap/app.bootstrap";

async function startApplication(): Promise<void> {
    await bootstrapApp();
    render(<App />, document.getElementById("app") as HTMLElement);
}

void startApplication();
