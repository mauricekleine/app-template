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
          room for
          <br />
          the next thing.
        </h1>
        <p className="intro">
          a small starting point for a useful app. the frame is here. what it does is yours to build.
        </p>
        <div className="opening-actions">
          <Button
            render={<a href="https://github.com/mauricekleine/app-template#readme" />}
            nativeButton={false}
            role="link"
          >
            make it yours <Icon name="arrow" />
          </Button>
          <a href="https://superthread.mauricekleine.com/components/button">explore the components</a>
        </div>
      </section>
      <section className="starting" aria-labelledby="starting-title">
        <div className="section-heading">
          <h2 id="starting-title" className="type-title">
            a place to begin
          </h2>
          <Badge variant="done">ready to build</Badge>
        </div>
        <div className="starting-row">
          <h3>your app</h3>
          <p>replace this page with the first task your app helps someone finish.</p>
        </div>
        <div className="starting-row">
          <h3>one shared frame</h3>
          <p>type, controls and the fleet rail come from superthread. try paper mode above.</p>
        </div>
        <div className="starting-row">
          <h3>two places to run</h3>
          <p>the same app builds for bun on soliton and for cloudflare workers.</p>
        </div>
      </section>
    </main>
  );
}
