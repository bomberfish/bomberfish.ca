console.log(
  "%c\n hello! :3",
  'font-family: "IBM Plex Mono", ui-monospace, monospace;font-weight: 900; font-size: 50px;color: #f38ba8; text-shadow: -2px -2px 0 #fab387 , -4px -4px 0 #f9e2af , -6px -6px 0 #a6e3a1 , -8px -8px 0 #94e2d5 , -10px -10px 0 #89b4fa , -12px -12px 0 #b4befe , -14px -14px 0 #cba6f7',
);

import "dreamland";
import { ThreeDeeApp } from "./3DSite/ThreeDeeApp.tsx";
import { ProjectListFlat } from "./ProjectCard.tsx";
import { jobs, projects } from "./Projects.ts";
import { ClickWall } from "./3DSite/ClickWall.tsx";
import { DarkReaderWarning } from "./DarkReaderWarning.tsx";
import { sharedCSS, articleCSS } from "./CommonCSS.tsx";
import { updatePage } from "./Themes";
import { Intro, SiteMap, DesignPhilosophy } from "./SiteContent.tsx";
import { convertRemToPixels } from "./Utils.ts";
import { Footer } from "./Footer.tsx";
import { Nav, TabBar } from "./Navigation.tsx";
import { oled } from "./Themes";
import { oneko } from "./Oneko.ts";
// import { Cursor } from "./Cursor.tsx";

// MARK: THEMING
export let store = $store(
  {
    theme: oled,
    playMusic: false,
  },
  { ident: "userOptions", backing: "localstorage", autosave: "auto" },
);

export let globalState = $state({
  freakyMode: false,
});

const App: Component<
  {},
  {
    rotation: number;
    velX: number;
    velY: number;
    posX: number;
    posY: number;
    targetX: number;
    targetY: number;
    rafId?: number;
    timeout: boolean;
    selectedTab: number;
    elements: Element[];
  }
> = function () {
  this.velX = 0;
  this.velY = 0;
  this.posX = window.innerWidth / 2;
  this.posY = window.innerHeight / 2;
  this.targetX = this.posX;
  this.targetY = this.posY;
  this.rotation = 0;
  this.timeout = false;
  this.selectedTab = 0;
  this.elements = [
    <Intro />,
    <div>
      <h1 style="margin-bottom: 1.5rem!important;">work experience</h1>
      <ProjectListFlat projects={jobs} size="small" />
      <h1 style="margin-bottom: 1.5rem!important;">projects <h2 style="display: inline; color: var(--subtext0)">(featured)</h2></h1>
      <ProjectListFlat projects={projects.filter((project) => project.featured)
            .sort((a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0))} size="large" />
      <h2 style="margin-bottom: 1.5rem!important; color: var(--subtext0)">other</h2>
      <ProjectListFlat projects={projects.filter((project) => !project.featured)} size="small" />
    </div>,
    <SiteMap />,
    <DesignPhilosophy />,
  ];
  this.css = `
    color: var(--text);
    font-family: var(--font-body);
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    // height: 100vh;
    max-width: 100vw;
    overflow-x: hidden;
    margin-bottom: 1.5rem;

    #content {
      background: var(--crust);
      width: min(100vw, max(60vw, 800px));
      height: 60vh;
      height: min-content;
      border-radius: 0 0 1.2rem 1.2rem;
      border-bottom: 1px solid var(--surface0);
      border-left: 1px solid var(--surface0);
      border-right: 1px solid var(--surface0);
    }

    #mainarticle {
      height: 100%;
      overflow: hidden;
      transition: 0.35s, opacity 0.15s;
      transition-timing-function: ease;
    }

    #content > *:not(#tabs) {
      padding-inline: 1.25rem;
    }

    #mainarticle.transparent {
      opacity: 0;
      transition: 0.35s, opacity 0.15s;
      transition-timing-function: ease;
    }

    footer {
      padding-bottom: 1rem;
    }
  `;

  function updateSize() {
    document.getElementById("mainarticle")!.style.height =
      document
        .getElementById("mainarticle")!
        .children[0]!.getBoundingClientRect().height +
      convertRemToPixels(1) +
      "px";
  }

  setTimeout(() => {
    // console.warn(document.getElementById("content")!.getBoundingClientRect().height);
    // console.warn(document.getElementById("mainarticle")!.getBoundingClientRect().height);
    updateSize();

    // Prime the background motion once so CSS vars have sane initial values
    document.querySelector("main")?.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: window.innerWidth,
        clientY: window.innerHeight,
      }),
    );
    // console.warn(document.getElementById("content")!.getBoundingClientRect().height);
    // console.warn(document.getElementById("mainarticle")!.getBoundingClientRect().height);
  }, 1);

  window.addEventListener("resize", () => {
    updateSize();
  });

  document.addEventListener("force-tab-resize", () => {
    updateSize();
  });

  document.addEventListener("pointermove", (e: PointerEvent) => {
    // console.debug(e.clientX, e.clientY);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      console.info("user prefers less motion");
      return;
    }
    // Update the target position; the animation loop will interpolate toward it.
    this.targetX = e.clientX;
    this.targetY = e.clientY;
  });

  // Continuous animation loop that eases toward the last known pointer location
  const step = () => {
    // Respect reduced motion; keep the loop alive in case the pref changes
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      this.rafId = requestAnimationFrame(step);
      return;
    }

    const obedience = 0.05; // easing factor; higher = snappier
    this.velX = obedience * (this.targetX - this.posX);
    this.velY = obedience * (this.targetY - this.posY);
    this.posX += (this.velX / 1.5);
    this.posY += (this.velY / 1.5);

    document.documentElement.style.setProperty("--bgmoveX", this.posX + "px");
    document.documentElement.style.setProperty("--bgmoveY", this.posY + "px");

    this.rafId = requestAnimationFrame(step);
  };
  this.rafId = requestAnimationFrame(step);

  return (
    <main
      class={sharedCSS}
      style={{
        fontFamily: use(globalState.freakyMode, (freak) =>
          freak ? "Papyrus, cursive!important" : "var(--font-body)",
        ),
      }}
    >
      <Nav />
      <div id="content">
        <TabBar
          tabs={[
            "about me",
            "my work",
            "sitemap",
            "about this site",
          ]}
          bind:tab={use(this.selectedTab)}
        />
        <article id="mainarticle" class={articleCSS}>
          {use(this.selectedTab, (tab) => this.elements[tab])}
        </article>
        <br></br>
        <Footer />
      </div>
    </main>
  );
};

// MARK: WINDOW LOAD
window.addEventListener("load", async () => {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      document.querySelectorAll(".popup").forEach((popup) => {
        popup.classList.add("transparent");
        setTimeout(() => {
          popup.remove();
        }, 200);
      });
    }
  });

  let params = new URL(window.location.href).searchParams;
  console.debug(params);
  if (params.has("higherdimension")) {
    let app;
    try {
      app = <ThreeDeeApp />;
    } catch (e) {
      (document.querySelector(".no-js")! as HTMLElement).style.display =
        "block";
      document.body.style.margin = "2%";
      return;
    }
    let audio: HTMLAudioElement = new Audio("/epic.ogg");
    audio.loop = true;

    document.addEventListener("end-music", () => {
      audio.pause();
    });

    document.addEventListener("music-restart", () => {
      audio.play();
    });

    // const audioCtx = new AudioContext();
    // const analyser = audioCtx.createAnalyser();

    // const source = audioCtx.createMediaElementSource(audio);
    // console.debug(source);
    // source.connect(analyser).connect(audioCtx.destination);
    // console.debug(source);

    if (store.playMusic !== false) {
      console.info("music start");
      audio.play().catch((e) => {
        console.error("could not start audio: " + e);
        document.body.appendChild(<ClickWall />);
        return;
      });
      // audioCtx.resume();
    }

    document.getElementById("app")!.replaceWith(app);
    document.body.classList.add("cool");
  } else {
    let app;
    try {
      app = <App />;
    } catch (e) {
      (document.querySelector(".no-js")! as HTMLElement).style.display =
        "block";
      document.body.style.margin = "2%";
      return;
    }
    oneko();
    document.getElementById("app")!.replaceWith(app);

    var konamiCurrent = 0;
    var konamiCode = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ];

    document.documentElement.addEventListener("keydown", (e: KeyboardEvent) => {
      console.debug(e.key);

      if (e.key === konamiCode[konamiCurrent]) {
        console.debug("match");
        document.getElementById("k" + konamiCurrent)?.classList.add("active");
        e.preventDefault();
        konamiCurrent++;

        if (konamiCurrent === konamiCode.length) {
          konamiCurrent = 0;
          window.location.href =
            new URL(window.location.href).origin + "/?higherdimension";
        }
      } else {
        konamiCurrent = 0;
        for (let i = 0; i < konamiCode.length; i++) {
          document.getElementById("k" + i)?.classList.remove("active");
        }
      }
    });
  }

  updatePage();

  // document.body.appendChild(<Cursor />);

  setInterval(() => {
    if (
      document.documentElement.getAttribute("data-darkreader-mode") ||
      document.documentElement.getAttribute("data-darkreader-scheme")
    ) {
      document.body.appendChild(<DarkReaderWarning />);
    }
  }, 1000);

  const fnt = new FontFace(
    "Material Symbols Rounded",
    "url(https://fonts.gstatic.com/s/materialsymbolsrounded/v181/syl0-zNym6YjUruM-QrEh7-nyTnjDwKNJ_190FjpZIvDmUSVOK7BDB_Qb9vUSzq3wzLK-P0J-V_Zs-QtQth3-jOcbTCVpeRL2w5rwZu2rIelXxc.woff2)",
  );
  document.fonts.add(fnt);
  fnt.load(); // async load the font to prevent really wanky shit when something that uses it first appears
});
