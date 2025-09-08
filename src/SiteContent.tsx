import "dreamland";
import { articleCSS } from "./CommonCSS";

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
      </h1>
      <p>i'm hariz, a 16 y/o high school student from canada :3</p>
      <p>
        i sometimes make <code>use(ful|less)</code> projects among other stuff.
      </p>
      <p>
        <br></br>
        as for <code>.* engineering</code>, I'm interested in:
        <ul>
          <li>embedded systems and hardware</li>
          <li>ios development with swiftui</li>
          <li>
            webdev (as you can tell from this immaculately put-together
            portfolio)
          </li>
          <li>...and a little bit of security research!</li>
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
            <li>swift (the GOAT)</li>
            <li>javascript/typescript</li>
            <li>c/c++/objective-c</li>
            <li>bash</li>
            <li>python</li>
          </ul>
        </li>
        <li>
          part of{" "}
          <a href="https://mercurywork.shop" target="blank">
            mercury workshop
          </a>
          , a software development team best known for the{" "}
          <a href="https://sh1mmer.me" target="blank">
            sh1mmer
          </a>{" "}
          chromebook exploit.
        </li>
        <li>an amateur music producer! stay tuned for more info!</li>
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
          <ul>
            <li>
              if you use bluesky, you can follow&nbsp;
              <a
                href="https://bsky.app/profile/bomberfish.ca"
                target="blank"
              >
                @bomberfish.ca
              </a>
              &nbsp;to view my posts on the fediverse. please note, this is
              usually a few minutes behind!
            </li>
            <li>
              if you use neither of those, you can view my latest post in the
              "yapping" tab above.
            </li>
          </ul>
        </li>
        <li>
          <a href="mailto:hariz@bomberfish.ca">email</a> (hariz@bomberfish.ca)
          <ul>
            <li>
              i might be slow to respond, since i don't check my email often.
            </li>
            <li>every email address @bomberfish.ca belongs to me.</li>
          </ul>
        </li>
        <li>
          discord
          <ul>
            <li>
              @bomberfish <strong>(main account)</strong>
            </li>
            <li>@realtimsweeneyepic</li>
            <li>@pageprotectionlayer</li>
            <li>@securepagetablemonitor</li>
          </ul>
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
          <span>signal: @bomberfish.77</span>
          <ul>
            <li>please only use this if all else fails!</li>
          </ul>
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
