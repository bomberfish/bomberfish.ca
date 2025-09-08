import "dreamland";
import { ThemePicker } from "./Themes";
import { convertRemToPixels } from "./Utils";

export const Nav: Component<
  {},
  { rotation: number; name: string; nameState: boolean }
> = function () {
  this.rotation = 0;
  this.name = "BomberFish";
  this.nameState = false;
  this.css = `
    background: var(--mantle);
    justify-self: flex-start;
    z-index: 100;
    padding: 0.25em 1.25rem;
    width: min(100vw, max(60vw, 800px));
    height: 3.75rem;
    margin: 0;
    display: flex;
    flex-direction: row;
    align-items: center;
    border-left: 1px solid var(--surface0);
    border-right: 1px solid var(--surface0);

    h2 {
      justify-self: flex-start;
      margin: 0;
      user-select: none;
      display: flex;
      align-items: flex-start;
      margin: 0!important;
      gap: 0.1rem;
      font-weight: normal !important;
      font-size: 1.75rem!important;

      /* Nintendo Switch-style 3d spinning text effect */
      & > span {
        animation: spin 5s cubic-bezier(0.37, 0, 0.63, 1) infinite;

        &:nth-of-type(1) {
            animation-delay: 0.7s;
        }
        &:nth-of-type(2) {
            animation-delay: 0.775s;
        }
        &:nth-of-type(3) {
            animation-delay: 0.85s;
        }
        &:nth-of-type(4) {
            animation-delay: 0.925s;
        }
        &:nth-of-type(5) {
            animation-delay: 1.0s;
        }
        &:nth-of-type(6) {
            animation-delay: 1.075s;
        }
        &:nth-of-type(7) {
            animation-delay: 1.15s;
        }
        &:nth-of-type(8) {
            animation-delay: 1.225s;
        }
        &:nth-of-type(9) {
          animation-delay: 1.3s;
        }
        &:nth-of-type(10) {
          animation-delay: 1.375s;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        & > span {
          animation: none;
        }
      }
    }

    img {
      -webkit-border-radius: 100%;
      -moz-border-radius: 100%;
      border-radius: 100%;
      display: inline;
      margin-left: 0;
      margin-right: 0.4em;
      cursor: pointer;
      -webkit-transition: -webkit-transform 0.5s cubic-bezier(0.3, 0, 0.6, 1);
      transition: -webkit-transform 0.5s cubic-bezier(0.3, 0, 0.6, 1);
      -o-transition: -o-transform 0.5s cubic-bezier(0.3, 0, 0.6, 1);
      -moz-transition: transform 0.5s cubic-bezier(0.3, 0, 0.6, 1),
        -moz-transform 0.5s cubic-bezier(0.3, 0, 0.6, 1);
      transition: transform 0.5s cubic-bezier(0.3, 0, 0.6, 1);
      transition: transform 0.5s cubic-bezier(0.3, 0, 0.6, 1),
        -webkit-transform 0.5s cubic-bezier(0.3, 0, 0.6, 1),
        -moz-transform 0.5s cubic-bezier(0.3, 0, 0.6, 1),
        -o-transform 0.5s cubic-bezier(0.3, 0, 0.6, 1);
      -webkit-transform: rotate(0deg);
      -moz-transform: rotate(0deg);
      -ms-transform: rotate(0deg);
      -o-transform: rotate(0deg);
      transform: rotate(0deg);
      background: black;
      padding: 2px;

      width: 2.2rem;
      height: 2.2rem;

      user-select: none;
      -webkit-user-drag: none;
      -webkit-user-select: none;
    }

    #title {
      display: flex;
      align-items: center;
      justify-self: flex-start;
      font-family: var(--font-serif);
      font-weight: normal !important;
      font-size: 2rem!important;
    }

    subt {
      font-size: 0.875rem !important;
      font-family: var(--font-mono);
      margin-top: 0.3em;
    }

    #right {
      justify-self: flex-end;
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      & > a {
        text-decoration: none;
        transform: scale(1);
        color: var(--accent);
        font-size: 1rem;
        display: flex;
        align-items: center;

        user-select: none;
        -webkit-user-drag: none;
        -webkit-user-select: none;
      }
    }

    @media (orientation: portrait) {
      #bloglink-title {
        display: none;
      }
    }

    @keyframes spin {
        0% {
            transform: rotate3d(0, 1, 0, 0deg);
        }
        10% {
            transform: rotate3d(0, 1, 0, 359deg);
        }
        100% {
            transform: rotate3d(0, 1, 0, 360deg);
        }
    }
  `;
  return (
    <nav>
      <span id="title">
        <img
          src="/favicon.ico"
          alt="my profile picture"
          title="click me!"
          style={{ transform: use`rotate(${this.rotation}deg)` }}
          on:click={(e: MouseEvent) => {
            e.preventDefault();
            console.log("click");
            this.rotation -= 1440;
          }}
        />
        <h2 aria-label="BomberFish (he/they)">
          <span>b</span>
          <span>o</span>
          <span>m</span>
          <span>b</span>
          <span>e</span>
          <span>r</span>
          <span>f</span>
          <span>i</span>
          <span>s</span>
          <span>h</span>
          <subt>(he/they)</subt>
        </h2>
      </span>
      <span id="right">
        <a href="https://blog.bomberfish.ca" target="_blank">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24px"
            viewBox="0 -960 960 960"
            width="24px"
            fill="var(--accent)"
          >
            <path d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z" />
          </svg>
          &nbsp;<span id="bloglink-title">blog</span>
        </a>
        <ThemePicker />
      </span>
    </nav>
  );
};

export const TabBar: Component<
  { tabs: string[]; tab?: number },
  { tabInternal: number }
> = function () {
  this.tab = 0;
  this.tabInternal = 0;
  this.css = `
 	margin-bottom: 1rem;
    padding-block: 0.5rem;
	overflow-x: auto;
  overflow-y: visible;
	background: var(--mantle);

    @keyframes bounce {
        0%, 100% {
            transform: translateY(0.15rem);
        }
        40%,60% {
            transform: translateY(-0.15rem);
        }
    }

    div {
        display: flex;
        justify-content: flex-start;
        gap: 1.5rem;
        width: 100%;
        margin-block: 0.25rem;
        // padding-inline: 0.5rem;
    }

    button, button.active, button:hover, button:focus, button:active {
        transition: all 0.35s cubic-bezier(0, 0.55, 0.45, 1)!important;
    }

    button {
        font-family: var(--font-display);
        font-weight: 500;
        font-size: 1.2rem;

        animation: bounce 1s cubic-bezier(0.2, 0, 0.8, 1) infinite;

        &:nth-of-type(7) {
          animation-delay: -0.1s;
        }

        &:nth-of-type(6) {
          animation-delay: -0.2s;
        }

        &:nth-of-type(5) {
          animation-delay: -0.3s;
        }

        &:nth-of-type(4) {
          animation-delay: -0.4s;
        }

        &:nth-of-type(3) {
          animation-delay: -0.5s;
        }

        &:nth-of-type(2) {
          animation-delay: -0.6s;
        }

        &:nth-of-type(1) {
          animation-delay: -0.7s;
        }

        white-space: nowrap;

        background: transparent;
        color: var(--text);
        padding: 0;
        padding-bottom: 1px;
        border: none;
        outline: none!important;
        cursor: pointer;

        user-select: none;
        -webkit-user-drag: none;
        -webkit-user-select: none;

        border-bottom: 3.25px solid transparent;
        border-radius: 0;

        font-weight: 500;

        color: var(--overlay1);
        filter: drop-shadow(0 0 10px transparent);
        scale: 1;

        &.selected {
          filter: drop-shadow(0 0 10px color-mix(in srgb, var(--accent) 70%, transparent));
     			color: var(--text);
     			padding-bottom: 1px;
     			border-bottom-color: var(--accent);
     			font-weight: 700;
        }

        &:hover:not(.selected),
        &:focus:not(.selected) {
          filter: drop-shadow(0 0 10px var(--overlay1));
     			border-width: 2px;
     			padding-bottom: 0.1em;
     			border-bottom-color: var(--surface2);
        }

        &:hover:not(.selected) {
        	font-weight: 350;
          color: var(--subtext0);
        }

        &:active:not(.selected) {
   	      scale: 0.95;
          font-weight: 250;
          border-width: 1.5px;
        }

        &:first-of-type {
            margin-left: 1.25rem;
        }

        &:last-of-type {
            margin-right: 1.25rem;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        button {
            animation: none;
        }
    }
  `;

  return (
    <div id="tabs">
      <div>
        {use(this.tabs, (tabs) =>
          tabs.map((tab, index) => (
            <button
              // class={use(this.tabInternal, (tab) => [
              //   tab === index ? "active" : "",
              // ])}
              class:selected={use(this.tabInternal, (tabi) => tabi == index)}
              on:click={() => {
                if (this.tabInternal === index) return;
                this.tabInternal = index;
                document
                  .getElementById("mainarticle")!
                  .classList.add("transparent");
                if (
                  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ) {
                  document.getElementById("mainarticle")!.style.height = "0px";
                }
                setTimeout(
                  () => {
                    this.tab = index;
                    document.getElementById("mainarticle")!.style.height =
                      document
                        .getElementById("mainarticle")!
                        .children[0]!.getBoundingClientRect().height +
                      convertRemToPixels(1) +
                      "px";
                    document
                      .getElementById("mainarticle")!
                      .classList.remove("transparent");
                  },
                  window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? 150
                    : 570,
                );
              }}
            >
              <span>{tab}</span>
            </button>
          )),
        )}
      </div>
    </div>
  );
};
