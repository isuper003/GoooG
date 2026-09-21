/** A photo gallery listed on a PornPics performer/search page. */
export interface GalleryCard {
  cover: string;
  url: string;
  title: string;
}

/** Full-size photos of one PornPics gallery. */
export interface GalleryImagesResponse {
  url: string;
  title: string;
  images: string[];
}
