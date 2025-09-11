import "dreamland";
import { articleCSS } from "./CommonCSS";
import isMobile from "./IsMobile";

export const FullArticle: Component<{}, {}> = function () {
  return (
    <article class={articleCSS}>
      <IntroSmall />
      <About />
      <Contact />
      <SiteMap />
    </article>
  );
};

export const Intro: Component<{}, {}> = function () {
  this.css = `
    #kawaii {
      width: max(20rem, 30%);
      height: auto;
      margin: 0 0 1rem 2rem;
    }

    .intro {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;

    }

    @media (orientation: portrait), (max-width: 800px) {
      #kawaii {
        display: none; /* TODO: Figure something out */
      }
    }
  `;

  return (
    <div>
      <div>
        <div class="intro">
          <IntroSmall />
          <img id="kawaii" src="/kawaii.webp" alt="Vtuber-style logo" />
          <div></div>
        </div>
        <About />
        <Contact />
      </div>
    </div>
  );
};

export const IntroSmall: Component<{}, {}> = function () {
  this.css = `
  h1 {
    font-size: 4rem!important;
    cursor: default;
    font-weight: bold!important;
  }


  #konami {
    font-size: 0.8rem;
    margin-top: 0.35rem;
    margin-bottom: 1rem;
  }

  #konami > kbd {
        margin-right: 0.65em;
        font-size: 1em;
        color: var(--overlay1);
        border-color: var(--overlay1);
        padding: 0.2em 0.6em;
        transition: 0.2s;
        &.active {
          color: var(--accent);
          border-color: var(--accent);
          box-shadow: 0 0 4rem 0 color-mix(in srgb, transparent 70%, var(--accent));
        }
      }

      #konami > a {
        opacity: 0;
        pointer-events: none;
        transition: 0.2s;
      }

      #konami:hover > a,
      #konami:focus-within > a {
        opacity: 1;
        pointer-events: auto;
        transition: 0.2s;
      }

  // h1>span {
  //   font-weight: 900!important;
  //   transition: font-weight 0.25s ease,
  //               letter-spacing 0.25s ease;
  //   letter-spacing: 0em;
  // }

  // h1:hover > span {
  //   font-weight: 100!important;
  //   transition: font-weight 0.25s ease,
  //               letter-spacing 0.25s ease;
  //   letter-spacing: 0.09em;
  // }
    `;
  return (
    <section>
      <h1>
        <span>hiya!</span> 👋

        {$if(
          new URL(window.location.href).searchParams.get("higherdimension") ===
            null && !isMobile(),
          <div>
            {/* <div>
                      Pro tip: you can navigate this site with your keyboard! Press{" "}
                      <kbd>tab</kbd> to start.
                      <br></br>
                      <br></br>
                    </div> */}
            <div id="konami">
              <kbd id="k0">↑</kbd>
              <kbd id="k1">↑</kbd>
              <kbd id="k2">↓</kbd>
              <kbd id="k3">↓</kbd>
              <kbd id="k4">←</kbd>
              <kbd id="k5">→</kbd>
              <kbd id="k6">←</kbd>
              <kbd id="k7">→</kbd>
              <kbd id="k8">b</kbd>
              <kbd id="k9">a</kbd>
              <a href="/?higherdimension">I'm lazy</a>
            </div>
          </div>,
        )}

      </h1>
      <p>i'm hariz, a 16 y/o high school student from canada :3</p>
      <p>
        i sometimes make <code>use(ful|less)</code> projects, among other stuff.
      </p>
      <subt>(make sure to check the "my work" tab!)</subt>
      <p>
        <br></br>
        as for <code>.* engineering</code>, I'm interested in:
        <ul>
          <li>
            webdev and frontend design (this site is a good example!)
          </li>
          <li>embedded systems and hardware</li>
        </ul>
      </p>
    </section>
  );
};

export const About: Component<{}, {}> = function () {
  return (
    <section>
      <h2>i'm also...</h2>
      <ul>
        <li>one of the winners of the 2024 swift student challenge</li>
        <li>
          fluent in the following programming languages:
          <ul>
            <li>swift</li>
            <li>javascript/typescript</li>
            <li>c/c++/objective-c</li>
            <li>python</li>
          </ul>
        </li>
        <li>
          part of{" "}
          <a href="https://mercurywork.shop" target="blank">
            mercury workshop
          </a>
          , a software development collective best known for the{" "}
          <a href="https://sh1mmer.me" target="blank">
            sh1mmer
          </a>{" "}
          chromebook exploit.
        </li>
        <li>an amateur music producer!</li>
      </ul>
    </section>
  );
};

export const Contact: Component<{}, {}> = function () {
  return (
    <section>
      <h2>get in touch!</h2>
      <ul>
        <li>
          <a href="mailto:hariz@bomberfish.ca">email</a> (hariz@bomberfish.ca)
        </li>
        <li>
          <a href="https://github.com/BomberFish" target="blank" rel="me">
            github
          </a>
        </li>
        <li>
        <a href="https://x.com/bomberfish77" target="blank" rel="me">
            X
          </a>
          &nbsp;(@bomberfish77)
        </li>
        <li>
          <a href="https://wetdry.world/@fish" target="blank" rel="me">
            fediverse
          </a>
          &nbsp;(@fish@wetdry.world)
        </li>
        <li>
          <a
                href="https://bsky.app/profile/bomberfish.ca"
                target="blank"
              >
                bluesky
              </a> (@bomberfish.ca) <subt>(please note, this is
              usually a few minutes behind! it mirrors my fediverse account.)</subt>
        </li>
        <li>
          <a
            href="https://matrix.to/#/@bomberfish:omada.cafe"
            target="blank"
            rel="me"
          >
            matrix
          </a>{" "}
          (@bomberfish:omada.cafe)
        </li>
        <li>
          discord: @bomberfish
        </li>
        <li>
          <span>signal: @bomberfish.77</span>
        </li>
      </ul>
    </section>
  );
};

export const SiteMap: Component<{}, {}> = function () {
  return (
    <section>
      <h1>other things on this site</h1>
      <ul>
        <li>
          <a href="https://bomberfish.ca/games">/games</a>
        </li>
        <li>
          <a href="./coolthings/index.html">/coolthings</a>
        </li>
        <li>
          <a href="./tools/index.html">/tools</a>
        </li>
      </ul>
    </section>
  );
};

export const DesignPhilosophy: Component<{}, {}> = function () {
  return (
    <section>
      <h2>website design philosophy</h2>
      <ul>
        <li>be as keyboard-accessible as possible.</li>
        <li>
          javascript is not the enemy. take advantage of all the latest gizmos.
          <ul>
            <li>always include source maps. why not show off your code?</li>
          </ul>
        </li>
        <li>
          optimize for size. some people use (and pay for) Canadian cellular
          data.
        </li>
        <li>have some fun! Don't be too bland.</li>
      </ul>
    </section>
  );
};
