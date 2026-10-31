import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { app } from "../app";
import { themeScript } from "@/components/superthread/lib/theme";
import { Button } from "@/components/superthread/ui/button";
import { FleetRail } from "@/components/superthread/ui/fleet-rail";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: app.name },
      { name: "description", content: app.description },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: app.mark },
      { rel: "preconnect", href: "https://superthread.mauricekleine.com", crossOrigin: "anonymous" },
    ],
  }),
  component: Document,
  notFoundComponent: NotFound,
});

function Document() {
  return (
    // themeScript sets the mode on <html> and the colour on the tag before it, ahead of hydration
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="theme-color"
          content={__PAPER_COLOR__}
          data-light={__PAPER_COLOR__}
          data-dark={__VOID_COLOR__}
          suppressHydrationWarning
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        <a href="#main" className="skip-link">
          skip to content
        </a>
        <FleetRail current="app-template">
          <div className="ship-panel">
            <header className="masthead">
              <Link to="/" className="ship-name">
                <img src={app.mark} width={32} height={32} alt="" />
                {app.name}
              </Link>
            </header>
            <Outlet />
            <footer className="page-footer">
              <span>part of maurice's fleet</span>
              <a href="https://superthread.mauricekleine.com/install">built with superthread</a>
            </footer>
          </div>
        </FleetRail>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main id="main" className="page lost">
      <h1 className="type-hero">nothing here.</h1>
      <p className="intro">this address doesn't lead to a page. head back to the start.</p>
      <Button render={<Link to="/" />} nativeButton={false} role="link">
        back to the start
      </Button>
      <p className="lost-code type-meta">404 / page not found</p>
    </main>
  );
}
