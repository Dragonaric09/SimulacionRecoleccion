declare module "pdfmake/build/pdfmake" {
  type PdfDocument = {
    getBlob: () => Promise<Blob>;
    open: (targetWindow?: Window) => void | Promise<void>;
    download: (filename?: string) => void;
  };
  type PdfMake = {
    addVirtualFileSystem: (vfs: Record<string, string>) => void;
    createPdf: (definition: unknown) => PdfDocument;
  };
  const pdfMake: PdfMake;
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfs: Record<string, string>;
  export default vfs;
}
