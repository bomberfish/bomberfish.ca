import "dreamland";
import ProjectCardDetails from "./Project.ts";
import isMobile from "./IsMobile.ts";

// TODO: Use <dialog>
export const LargeProjectView: Component<{ project: ProjectCardDetails }, {}> =
  function () {
    this.mount = () => {
      setTimeout(() => {
        this.root.classList.remove("transparent");
      }, 1);
    };

    this.css = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 100;
      width: 100vw;
      height: 100vh;
      transform: translateZ(100px);

      transition: 0.2s cubic-bezier(0.3, 0, 0.6, 1);

   	  @media (orientation: landscape) {
   	 	.inner {
   			aspect-ratio: 800 / 565;
    		}
   	  }

      .inner {
        background: var(--base);
        // background-image: url(${this.project.img});
        min-width: 400px;
        width: max(55vw, 50rem);
        height: 60vh;
        position: absolute;
        top: 50%;
        left: 50%;
        border-radius: 1.25rem;
        transform: translateX(-50%) translateY(-50%);
        z-index: 100;
        border: 0.25px solid var(--surface0);
        overflow: hidden;
      }

      img {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        user-select: none;
        -webkit-user-drag: none;
        -webkit-user-select: none;
        object-fit: cover;
        z-index: 1;
      }

      .inner::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        backdrop-filter: blur(8px);
        mask-image: linear-gradient(rgba(0, 0, 0, 0.2) 30%, rgb(0, 0, 0, 1) 92%);
        background: linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8) 95%);
        z-index: 2;
        pointer-events: none;
      }

      #title,p {
        filter: drop-shadow(0 0 30px rgb(0, 0, 0));
      }

      #title {
        font-size: 4rem;
        padding-inline: 1.5rem;
        font-weight: bold;
        text-overflow: ellipsis;
        overflow: hidden;
        font-family: var(--font-serif);
        line-height: 1em;
        padding-bottom: 0.25em;
        margin-bottom: -0.1em;
        width: 100%;
      }

      button {
        user-select: none;
        -webkit-user-drag: none;
        -webkit-user-select: none;
        width: 36px;
        height: 36px;
        border-radius: 38px;
        background: color-mix(in srgb, var(--surface2) 45%, transparent)!important;
        transition: background 0.15s ease;
        backdrop-filter: blur(32px);
        cursor: pointer;

        overflow: hidden;
        transition: transform 0.3s ease;

        .label {
          font-size: 12px;
          margin-left: 2px;
          width: 0px;
          overflow: hidden;
          transition: width 0.3s ease;
        }
      }

      button:hover {
        background: color-mix(in srgb, var(--surface2) 60%, transparent)!important;
      }

      // button:hover .label {
      //   width: 48px;
      // }

      article {
        overflow: scroll;
        display: grid;
        place-items: center;
        height: 60vh;
      }

      .article-inner {
        overflow: scroll;
        position: relative;
        width: 100%;
        height: ${this.project.img ? "calc(100% - 7rem)" : "100%"};
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: ${this.project.img ? "flex-start" : "space-around"};
        overflow: scroll;
        align-self: ${this.project.img ? "flex-end" : "flex-start"};
        justify-self: center;
        z-index: 3;
        padding-bottom: 1rem;
      }

      .head {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 6rem;
        position: fixed;
        top: -1px;
        left: 0;
        right: 0;
        // background: var(--mantle);
        border-radius: 1.25rem 1.25rem 0 0;
        margin: 0;
        z-index: 1000;
      }

      .head > * {
        margin: 1.5rem;
      }

      .desc {
        align-self: flex-start;
        font-size: 1.25rem;
        margin-inline: 1rem;
      }

      .desc p {
        margin-left: 0.5rem;
        margin-bottom: 1.25rem;
      }

      button {
        appearance: none;
        background: none;
        border: none;
        // width: 25px;
        // height: 25px;
        color: var(--text);
        display: flex;
        align-items: center;
      }

      .popup-bg {
        transition: 0.2s cubic-bezier(0.3, 0, 0.6, 1);
        background: rgba(17, 17, 27, 0.4);
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 90;
        width: 100vw;
        height: 100vh;
        backdrop-filter: blur(1.5px);
        -webkit-backdrop-filter: blur(1.5px);
      }

      kbd {
        margin-right: 0.65rem;
      }

      .link {
        color: var(--text)!important;

        background: color-mix(in srgb, var(--surface0) 60%, transparent)!important;
        backdrop-filter: blur(30px);
        text-decoration: none;
        cursor: pointer;

        border: none!important;

        font-size: 1.2rem;

        border-radius: 0.75rem;
        padding: 0.5rem;

        .material-symbols-rounded {
          font-size: 1.6rem;
          margin-right: 0.5rem;
        }

        .link-inner {
          display: flex;
          align-items: center;
        }

        display: flex;
        align-items: center;
        justify-content: center;

        border: 0.1px solid var(--overlay1)!important;

        transition: color 0.2s;
      }

      .link:hover {
        transition: color 0.2s;
        color: var(--accent);
      }

      p.link {
        color: var(--subtext0);
        //font-style: italic;
        border-style: dashed;
        cursor: not-allowed;
      }

      p.link:hover {
        color: var(--subtext0);
      }

      .links {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(50%, 1fr));
        gap: 0.5rem;
      }

      &.transparent .inner {
          top: 100vw;
          transition: 0.2s ease-in-out;
        }

        &.transparent
         {
          transition: 0.2s cubic-bezier(0.3, 0, 0.6, 1);
        }

        .inner {
          transition: 0.4s cubic-bezier(0.3, 1.2, 0.4, 1);
        }

        &.transparent {
          opacity: 0;
          pointer-events: none;
        }

        &.transparent .popup-bg {
          transition: 0.2s cubic-bezier(0.3, 0, 0.6, 1);
          backdrop-filter: blur(0px);
          -webkit-backdrop-filter: blur(0px);
          background: rgba(0, 0, 0, 0);
        }
    `;

    return (
      <div class="popup transparent">
        <div
          class="popup-bg"
          on:click={() => {
            this.root.classList.add("transparent");
            setTimeout(() => {
              this.root.remove();
            }, 200);
          }}
        ></div>
        <div class="inner">
          <div class="head">
            <div></div>
            <button
              on:click={() => {
                this.root.classList.add("transparent");
                setTimeout(() => {
                  this.root.remove();
                }, 200);
              }}
            >
              {$if(!isMobile, <kbd>esc</kbd>)}
              <span class="material-symbols-rounded">close</span>
              <span class="label">Close</span>
            </button>
          </div>
          <article>
            {$if(this.project.img,
              (<img
                loading="lazy"
                src={this.project.img}
                // on:click={() => {
                //   window.open(this.project.img, "_blank");
                // }}
                referrerpolicy="no-referrer"
                crossorigin="anonymous"
              />),
            )}
            <div class="article-inner">
              {$if(this.project.img,
              <div style="flex-grow: 1;" />
              )}
              <span id="title">{this.project.title}</span>
              <div class="desc">
                <p>{this.project.largeDesc}</p>

                <div class="links">
                  {$if(
                    this.project.links?.length === 0,
                    <p class="link">
                      <span class="link-inner">
                        <span class="material-symbols-rounded">link_off</span>
                        No links available
                      </span>
                    </p>,
                  )}

                  {this.project.links?.map((link) => (
                    <a href={link.url} target="_blank" class="link">
                      <span class="link-inner">
                        <span class="material-symbols-rounded">
                          {link.icon ?? "globe"}
                        </span>
                        {link.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    );
  };
