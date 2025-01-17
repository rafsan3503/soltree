(function () {
  function Drop(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.dx = opts.dx || 0;
    this.dy = opts.dy || 0;
    this.exploded = false;
    this.size = 8;
    this.maxSize = this.size * 5;
    this.maxHeight = opts.maxHeight;
    this.rgb = {
      r: 100,
      g: 100,
      b: 255
    };
    this.transactionId = opts.transactionId; // Store transaction ID
  }

  Drop.prototype.fall = function (delta, forest) {
    if (this.exploded) {
      this.size += delta * 80;
      if (this.size > this.maxSize)
        return true;
      return false;
    }

    var tree = forest.getHitTree(this.x, this.y);

    if (tree || this.y > this.maxHeight)
      this.exploded = true;

    if (tree)
      tree.trigger('hit', { speed: this.dy });

    this.dy = Math.min(10, this.dy + delta);
    this.y += this.dy * delta * this.maxSize;

    this.x += this.dx * delta;
    return false;
  };

  Drop.prototype.render = function (ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Render the drop
    if (this.exploded) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = createRadialGradientToTransparent(ctx, this.size,
        this.rgb, (this.maxSize - this.size) / this.maxSize);
    } else {
      ctx.fillStyle = createRadialGradientToTransparent(ctx, this.size,
        this.rgb, 1);
    }
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, 2 * Math.PI);
    ctx.fill();

    // Render clickable transaction ID next to the drop
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "#FFFFFF"; // Change text color to white
    ctx.font = "12px Arial";
    ctx.textAlign = "left"; // Align text to the left so it's to the right of the drop

    // Position the text to the right of the drop
    const txX = this.x + this.size + 10; // 10px space from the right of the drop
    const txY = this.y + 5; // Align vertically with the drop
    ctx.fillText(this.transactionId, txX, txY);

    // Make it clickable by adding an event listener
    ctx.restore();
  };

  window.Drop = Drop;
})();
