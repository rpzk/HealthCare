declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: any)
    pipe(destination: any): this
    on(event: string, listener: (chunk?: any) => void): this
    fontSize(size: number): this
    text(text: string): this
    text(text: string, x: number, y: number, options?: any): this
    text(text: string, options?: any): this
    moveTo(x: number, y: number): this
    lineTo(x: number, y: number): this
    stroke(): this
    image(src: string | Buffer, x?: number, y?: number, options?: any): this
    addPage(options?: any): this
    end(): void
    rect(x: number, y: number, width: number, height: number): this
    fill(color?: string): this
    fillColor(color: string): this
    strokeColor(color: string): this
    lineWidth(width: number): this
    font(font: string, size?: number): this
    list(items: string[], x?: number, y?: number, options?: any): this
    moveDown(lines?: number): this
    ellipse(x: number, y: number, r1: number, r2?: number): this
    circle(x: number, y: number, radius: number): this
    polygon(...points: number[][]): this
    path(pathData: string): this
    dash(length: number, space?: number, phase?: number): this
    undash(): this
    lineCap(cap: string): this
    lineJoin(join: string): this
    miterLimit(limit: number): this
    opacity(opacity: number): this
    fillOpacity(opacity: number): this
    strokeOpacity(opacity: number): this
    clip(): this
    save(): this
    restore(): this
    transform(m1: number, m2: number, m3: number, m4: number, m5: number, m6: number): this
    translate(x: number, y: number): this
    rotate(angle: number, options?: any): this
    scale(xScale: number, yScale?: number, options?: any): this
    skew(xSkew: number, ySkew: number, options?: any): this
    registerFont(name: string, src: string | Buffer): void
    widthOfString(text: string, options?: any): number
    currentLineWidth(width?: number): number
    get y(): number
    set y(value: number)
    get x(): number
    set x(value: number)
  }

  export = PDFDocument
}
