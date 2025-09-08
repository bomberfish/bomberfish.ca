import "dreamland";
import ProjectCardDetails from "../Project";
import { projects } from "../Projects";
import { ProjectList } from "../ProjectCard";
import { Screen } from "./Screen";
import { sharedCSS } from "../CommonCSS";
import { store } from "../App";
import { ThreeDeeInfo } from "./ThreeDeeInfo";
import { FullArticle } from "../SiteContent";
import { convertRemToPixels } from "../Utils";
import { SuperCoolAndEpicDanceFloor } from "./3DFloor";
import { Footer } from "../Footer";
import { LatestToot } from "../LatestToot";

let keys = new Map();
document.addEventListener("keydown", (e) => {
  keys.set(e.key, true);
});
document.addEventListener("keyup", (e) => {
  keys.delete(e.key);
});
function keydown(key: string) {
  return keys.has(key);
}

function numberInput(text: string, initialValue: number): number {
  let ans = prompt(text, initialValue.toString());
  if (ans) {
    if (isNaN(+ans)) {
      alert("Invalid input");
      return initialValue;
    }
    return +ans;
  }
  return initialValue;
}

export const ThreeDeeApp: Component<
  {},
  {
    projects: ProjectCardDetails[];
    rotation: number;
    x: number;
    y: number;
    z: number;
    r: number;
    speed: number;
    mult: number;
  }
> = function () {
  this.projects = projects;
  this.rotation = 0;
  this.speed = 5;
  this.mult = 2;

  this.css = `
    width: 100%;
    height: 100%;
    perspective: var(--perspective);

    * {
    image-rendering: pixelated;
    -webkit-image-rendering: pixelated;
    }

    camera {
      position: absolute;
      inset: 0;
      pointer-events: all;
      perspective: var(--perspective);
      backface-visibility: hidden;
      contain: layout style size;
      width: 100%;
      height: 100%;
      transform-style: preserve-3d;
      will-change: transform;
    }

    stage {
      position: fixed;
      top: 50%!important;
      left: 50%!important;
      inset: 0;
      backface-visibility: shown;
      transform-style: preserve-3d;
    }

    debug {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 600;
      margin: 0;
      position: fixed;
      top: 0;
      left: 0;
      padding-top: 0.5rem;
      padding-left: 0.8rem;
      width: 10em;

      border-radius: 0 0 0.5em 0;

      z-index: 999;

      background: color-mix(in srgb, var(--base), transparent 30%);

      a {
        display: flex;
        text-decoration: none;
        font-size: 100%!important;
      }
    }
    input {
      accent-color: var(--accent);
    }

    }
  `;

  this.x = window.innerWidth / -40;
  this.y = window.innerHeight / 2;
  this.z = -200;
  this.r = -18;

  this.mount = () => {
    // alert(window.innerWidth)
    function easeOutCirc(x: number) {
      return Math.sqrt(1 - Math.pow(x - 1, 2));
    }

    console.debug("mount");
    const c = Math.abs(
      -(1000 + (2188 /* god this is so jank */ / window.innerWidth) * 200) -
        this.z,
    );
    console.debug(c);
    for (let i = 0; i < c; i++) {
      setTimeout(
        () => {
          // console.debug("z anim tick");
          this.z -= 1;
        },
        easeOutCirc(i / c) * 500,
      );
    }

    for (let i = 0; i < 30; i++) {
      setTimeout(
        () => {
          // console.debug("rot anim tick");
          this.r += 1;
        },
        easeOutCirc(i / 10) * 500,
      );
    }
  };

  setInterval(() => {
    // console.debug("polling inputs", keys)

    if (keydown("ArrowRight")) {
      this.r += 0.5;
      let orig = document.documentElement.style
        .getPropertyValue("--bgmoveX")
        .replace("px", "");
      document.documentElement.style.setProperty(
        "--bgmoveX",
        `${+orig - 2.5}px`,
      );
    }
    if (keydown("ArrowLeft")) {
      this.r -= 0.5;
      let orig = document.documentElement.style
        .getPropertyValue("--bgmoveX")
        .replace("px", "");
      document.documentElement.style.setProperty(
        "--bgmoveX",
        `${+orig + 2.5}px`,
      );
    }

    if (keydown("ArrowUp")) {
      this.y += keydown("Shift") ? this.speed * this.mult : this.speed;
      let orig = document.documentElement.style
        .getPropertyValue("--bgmoveY")
        .replace("px", "");
      document.documentElement.style.setProperty(
        "--bgmoveY",
        `${+orig + 0.35}px`,
      );
    }
    if (keydown("ArrowDown")) {
      this.y -= keydown("Shift") ? this.speed * this.mult : this.speed;
      let orig = document.documentElement.style
        .getPropertyValue("--bgmoveY")
        .replace("px", "");
      document.documentElement.style.setProperty(
        "--bgmoveY",
        `${+orig - 0.35}px`,
      );
    }

    if (keydown("w")) {
      let speed = keydown("Shift") ? this.speed * this.mult : this.speed;
      move(0, speed);
      // too buggy
      // let orig =
      //   document.documentElement.style.getPropertyValue("--bgscale") || "1";
      // document.documentElement.style.setProperty(
      //   "--bgscale",
      //   `${+orig + speed * 0.00015}`
      // );
    }

    if (keydown("s")) {
      let speed = -(keydown("Shift") ? this.speed * this.mult : this.speed);
      move(0, speed);
      // let orig =
      //   document.documentElement.style.getPropertyValue("--bgscale") || "1";
      // document.documentElement.style.setProperty(
      //   "--bgscale",
      //   `${+orig + speed * 0.00015}`
      // );
    }

    if (keydown("a")) {
      let speed = -(keydown("Shift") ? this.speed * this.mult : this.speed);
      move(speed, 0);
      let orig = document.documentElement.style
        .getPropertyValue("--bgmoveX")
        .replace("px", "");
      document.documentElement.style.setProperty(
        "--bgmoveX",
        `${+orig - speed * 0.35}px`,
      );
    }

    if (keydown("d")) {
      let speed = keydown("Shift") ? this.speed * this.mult : this.speed;
      move(speed, 0);
      let orig = document.documentElement.style
        .getPropertyValue("--bgmoveX")
        .replace("px", "");
      document.documentElement.style.setProperty(
        "--bgmoveX",
        `${+orig - speed * 0.35}px`,
      );
    }
  });

  const move = (x: number, z: number) => {
    // a bit more complex than neccesary because i'm bad at math
    const vel = -Math.hypot(x, z);
    const r = Math.atan2(z, x);
    const ang = this.r * -(Math.PI / 180) + r + Math.PI / 2;

    this.z += Math.cos(ang) * vel;
    this.x += Math.sin(ang) * vel;
  };

  return (
    <main class={sharedCSS}>
      <debug>
        <a href="./" style="color: var(--accent)">
          <span class="material-symbols-rounded">arrow_back</span> back to
          sanity
        </a>
        <br></br>
        <label
          for="speed"
          on:pointerdown={() => {
            this.speed = numberInput("Enter new speed", this.speed);
          }}
        >
          <div>{use`speed (${this.speed})`}</div>
        </label>
        <input
          type="range"
          min="0.1"
          max="200"
          id="speed"
          value={use(this.speed, (v) => v * 10)}
          on:change={() => {
            this.speed =
              +(document.getElementById("speed") as HTMLInputElement).value /
              10;
          }}
        />
        <div
          on:pointerdown={() => {
            this.x = numberInput("Enter new position", this.x);
          }}
        >
          x: {use(this.x, (v) => v.toFixed(2))}
        </div>
        <div
          on:pointerdown={() => {
            this.y = numberInput("Enter new position", this.y);
          }}
        >
          y: {use(this.y, (v) => v.toFixed(2))}
        </div>
        <div
          on:pointerdown={() => {
            this.z = numberInput("Enter new position", this.z);
          }}
        >
          z: {use(this.z, (v) => v.toFixed(2))}
        </div>
        <div
          on:pointerdown={() => {
            this.r = numberInput("Enter new position", this.r);
          }}
        >
          r: {use(this.r, (v) => v.toFixed(2))}
        </div>
        <br></br>
        {use(store.playMusic, (v) => (
          <div
            on:click={() => {
              store.playMusic = !store.playMusic;
              store.playMusic !== false
                ? document.dispatchEvent(new Event("music-restart"))
                : document.dispatchEvent(new Event("end-music"));
            }}
          >
            <span class="material-symbols-rounded">
              {v !== false ? "volume_up" : "volume_off"}
            </span>
          </div>
        ))}
      </debug>
      <camera
        style={{
          transform: use`translate3d(0px,0px, var(--perspective)) rotateX(0deg) rotateY(${this.r}deg) rotateZ(0deg) perspective(var(--perspective))`,
        }}
      >
        <stage
          style={{
            transform: use`translate3d(${this.x}px, ${this.y}px, ${this.z}px)`,
          }}
        >
          <Screen
            ry={10}
            rx={10}
            x={-12}
            y={-12}
            z={-15}
            width={400}
            height={960}
          >
            <article>
              <h1>projects</h1>
              <ProjectList projects={this.projects} />
            </article>
          </Screen>
          <Screen
            ry={-20}
            x={-4}
            y={-6}
            z={-5}
            width={convertRemToPixels(40)}
            height={convertRemToPixels(50)}
          >
            <FullArticle />
          </Screen>
          <Screen
            ry={-20}
            x={6}
            y={-2}
            z={-7}
            // width={window.innerWidth * 0.4}
            // height={window.innerHeight * 0.5}
          >
            <LatestToot />
          </Screen>
          <Screen
            // ry={30}
            rx={30}
            x={2}
            y={5}
            z={-4}
            autoHeight={true}
            width={convertRemToPixels(70)}
          >
            <article>
              <Footer />
            </article>
          </Screen>
          <Screen
            ry={-40}
            rz={10}
            rx={-2}
            x={14}
            y={-6}
            z={-10}
            width={convertRemToPixels(20)}
            height={convertRemToPixels(30)}
          >
            <ThreeDeeInfo />
          </Screen>
          <Screen
            ry={200}
            x={-5}
            y={-5}
            z={-20}
            width={convertRemToPixels(40)}
            height={convertRemToPixels(30)}
          >
            <article>
              <h2>Blog</h2>
              <iframe
                style="width: 100%; height: 100%;"
                src="https://blog.bomberfish.ca"
                frameborder="0"
              ></iframe>
            </article>
          </Screen>
          <Screen ry={-20} x={8} y={-10} z={-7} width={453} height={358.5}>
            <img
              src="/kawaii.webp"
              alt="Vtuber-style logo"
              style="width: 100%; height: 100%;"
            />
          </Screen>
          <Screen
            rx={-90}
            rz={2}
            width={1050}
            height={1350}
            x={-4}
            y={-15}
            z={10}
            nomove={true}
          >
            <SuperCoolAndEpicDanceFloor />
          </Screen>
        </stage>
      </camera>
    </main>
  );
};
