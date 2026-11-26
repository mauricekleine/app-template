import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/superthread/ui/button";
import { Badge } from "@/components/superthread/ui/badge";
import { Icon } from "@/components/superthread/ui/glyphs";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main id="main" className="page">
      <section className="opening" aria-labelledby="welcome">
        <h1 id="welcome" className="type-hero">
          Room for
          <br />
          the next thing.
        </h1>
        <p className="intro">
          A small starting point for a useful app. The frame is here. What it does is yours to build.
        </p>
        <div className="opening-actions">
          <Button
            render={<a href="https://github.com/mauricekleine/app-template#readme" />}
            nativeButton={false}
            role="link"
          >
            Make it yours <Icon name="arrow" />
          </Button>
          <a href="https://superthread.mauricekleine.com/components/button" className="link-quiet">
            Explore the components
          </a>
        </div>
      </section>
      <section className="starting" aria-labelledby="starting-title">
        <div className="section-heading">
          <h2 id="starting-title" className="type-title">
            A place to begin
          </h2>
          <Badge variant="done">Ready to build</Badge>
        </div>
        <div className="starting-row">
          <h3>Your app</h3>
          <p>Replace this page with the first task your app helps someone finish.</p>
        </div>
        <div className="starting-row">
          <h3>One shared frame</h3>
          <p>Type, controls and the fleet rail come from superthread. Try the mode toggle at the end of the rail.</p>
        </div>
        <div className="starting-row">
          <h3>Two places to run</h3>
          <p>The same app builds for Bun on Soliton and for Cloudflare Workers.</p>
        </div>
      </section>
    </main>
  );
}
