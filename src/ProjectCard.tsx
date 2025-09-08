import "dreamland";
import ProjectCardDetails from "./Project";
import { LargeProjectView } from "./LargeProjectView";

export const ProjectCard: Component<{ detail: ProjectCardDetails; size: 'small'|'large'; }, {}> =
  function () {
    this.css = `
      background: var(--surface0);
      width: 100%;
      ${this.size == "small" ? "height: 6rem;":"min-height: 280px;"}
      border-radius: 1rem!important;
      padding-bottom: 0.2rem;
      cursor: pointer;
      transform: scale(1);
      transition: 0.25s cubic-bezier(0, 0.55, 0.45, 1);
      --shadow-color: color-mix(in srgb, var(--accent) 30%, transparent);
      box-shadow: 0 0 0px var(--shadow-color);
      border: 1px dashed var(--overlay1);
      display: flex;
      flex-direction: ${this.size == "small" ? "row" : "column"}

      &:hover {
        transform: scale(1.02);
        transition: 0.25s cubic-bezier(0, 0.55, 0.45, 1);
        box-shadow: 0 0 20px var(--shadow-color);
        border-color: var(--accent);
      }

      &:focus,
      &:focus-visible {
        outline: none;
        border-color: var(--accent)!important;
        border-style: solid!important;
        transform: scale(1.05);
        transition: 0.25s cubic-bezier(0, 0.55, 0.45, 1);
        box-shadow: 0 0 20px var(--shadow-color);
      }

      &.active,
      &:active:focus {
        transform: scale(0.95);
        transition: 0.1s cubic-bezier(0, 0.55, 0.45, 1);
      }

    transform: translateZ(50px);

    .img-container {
      ${this.size == "small" ? "width: 6rem; height: 6rem;" : "width: 100%; height: auto;" }
        aspect-ratio: ${this.size == "small" ? "1 / 1" : "512 / 277"};
    }

    img {
      user-select: none;
      -webkit-user-drag: none;
      -webkit-user-select: none;
      border-radius: 0.9rem;
      width: ${this.size == "small" ? "calc(6rem - 1px)" : "calc(100% - 1px)"};
      height: ${this.size == "small" ? "calc(6rem - 2px)" : "calc(100% - 1px)"};
      object-fit: cover;
    }

    .img-placeholder {
      display: flex;
      justify-content: center;
      align-items: center;
      width: ${this.size == "small" ? "calc(6rem - 1px)" : "calc(100% - 1px)"};
      height: ${this.size == "small" ? "calc(6rem - 2px)" : "calc(100% - 1px)"};
      border-radius: 0.9rem;
      background: var(--base);
      color: var(--subtext0);
      span {
        font-size: 3rem;
      }
    }

    .title {
      display: flex;
      align-items: center;
      margin-top: 0.2rem;
      font-family: var(--font-body);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex-wrap: wrap;
      font-size: 1rem;
    }

    p {
      margin: 0!important;
      margin-top: 0.025rem!important;
      line-height: 1.2rem;
      min-height: 2.4rem;
      vertical-align: center;
      font-size: ${this.size == "small" ? "0.8rem" : "1rem"};
    }

    .title > span {
      font-size: ${this.size == "small" ? "1.25rem" : "1.5rem"};
      font-weight: 600;
      margin-right: 0.5rem;
      font-family: var(--font-serif);
    }

    .detail {
      margin: 1rem;
      margin-top: 0.1rem;
    }

    p {
      margin-top: 0.5rem;
      margin-bottom: 1rem;
    }

    kbd {
      position: absolute;
      right: 1rem;
      top: 75%;
      opacity: 0;
      transition: opacity 0.2s;
    }

    subt {
      line-height: 1.5rem!important;
      font-size: ${this.size == "small" ? "0.7rem" : "0.9rem"};
    }
    `;

    return (
      <div
        class="card"
        on:pointerup={() => {
          document
            .querySelector("main")!
            .appendChild(<LargeProjectView project={this.detail} />);
          (document.activeElement as HTMLElement)?.blur();
        }}
        on:keydown={(e: KeyboardEvent) => {
          if (e.key === "Enter") {
            this.root.classList.add("active");
            setTimeout(() => {
              var ptr = new PointerEvent("pointerup", {
                bubbles: true,
                cancelable: true,
              });
              this.root.dispatchEvent(ptr);

              this.root.classList.remove("active");
            }, 200);
          }
        }}
        tabindex="0"
      >
        <div
          class="img-container"
        >
          {$if(
            this.detail.img != undefined,
            <img
              loading="lazy"
              src={this.detail.img}
              alt={this.detail.blurb}
              referrerpolicy="no-referrer"
              crossorigin="anonymous"
            />,
            <div class="img-placeholder">
              <span class="material-symbols-rounded">broken_image</span>
            </div>,
          )}
        </div>
        <div class="detail">
          <div class="title">
            <span>{this.detail.title}</span>{" "}
            <subt>({
              this.detail.startYear == this.detail.endYear ? this.detail.startYear : this.detail.startYear + "–" + (this.detail.endYear || "present")
            })</subt>
          </div>
          <p>{this.detail.blurb}</p>
          <kbd>↩</kbd>
        </div>
      </div>
    );
  };

  export const ProjectListFlat: Component<{projects: ProjectCardDetails[]},{}> = function() {
     this.css = `
    margin-bottom: 1.5rem;
      .projects-group {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        grid-gap: 1.25rem;
        place-items: center;
        place-content: center;
        width: calc(100% - 2.5rem);
        margin: 0 1.25rem;
      }
      `;
    return (
      <div class="projects-container">
<div class="projects-group">
        {use(this.projects, (projects) =>
          projects
            
            .map((project) => <ProjectCard detail={project} size="small" />),
        )}
      </div>
      </div>
    )
  }

export const ProjectList: Component<{ projects: ProjectCardDetails[] }, {}> =
  function () {
    this.css = `
    margin-bottom: 1.5rem;
      .projects-group {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        grid-gap: 1.25rem;
        place-items: center;
        place-content: center;
        width: calc(100% - 2.5rem);
        margin: 0 1.25rem;
      }
      `;
    return (
      <div class="projects-container">
      <h2>featured</h2>
      <div class="projects-group">
        {use(this.projects, (projects) =>
          projects
            .filter((project) => project.featured)
            .sort((a, b) => (a.featuredPosition || 0) - (b.featuredPosition || 0))
            .map((project) => <ProjectCard detail={project} size="large" />),
        )}
      </div><br />
      <h2>other</h2>
      <div class="projects-group">
        {use(this.projects, (projects) =>
          projects
            .filter((project) => !project.featured)
            .map((project) => <ProjectCard detail={project} size="small" />),
        )}
      </div>
      </div>
    );
  };
