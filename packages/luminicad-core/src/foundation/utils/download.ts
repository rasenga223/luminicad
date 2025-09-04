export function download(data: BlobPart[], name: string) {
    let blob = new Blob(data);
    let a = document.createElement("a");
    a.style.visibility = "hidden";
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
}
