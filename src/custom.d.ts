declare module "*.html" {
  const content: string;
  export default content;
}

interface ImportMeta {
  dir: string;
}
