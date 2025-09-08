export default class ProjectCardDetails {
  img: string | undefined;
  title: string;
  blurb: string;
  startYear: number;
  endYear?: number;
  largeDesc: string;
  links?: { name: string; url: string; icon?: string }[];
  featured?: boolean;
  featuredPosition?: number | undefined;

  constructor(
    imgURL: string | undefined,
    title: string,
    blurb: string,
    largeDesc: string,
    startYear: number,
    endYear?: number,
    links?: { name: string; url: string; icon?: string }[],
    featured?: boolean,
    featuredPosition?: number | undefined,
  ) {
    this.img = imgURL;
    this.title = title;
    this.blurb = blurb;
    this.startYear = startYear;
    this.endYear = endYear;
    this.largeDesc = largeDesc;
    this.links = links;
    this.featured = featured;
    this.featuredPosition = featuredPosition;
  }
}
