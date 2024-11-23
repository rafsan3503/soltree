(function () {
  var MAX_DEPTH = 10,       // Increased depth for more levels of branching
    MAX_SIZE = 200,
    NEW_BRANCH = 40;        // Lowered new branch size to increase branching frequency

  // Initialize count and set up WebSocket connection
  let count = 1;  // Default value for count
  const socket = io('https://api.generativetree.xyz');  // Adjust URL to your WebSocket server

  socket.on('totalTxCount', (data) => {
    count = data.totalTxCount;  // Update count from server
    localStorage.setItem('initialCount', count);  // Store if needed elsewhere
    console.log(`Received total transaction count: ${count}`);
  });

  // Define a fixed configuration for the tree structure with both left and right angles
  const treeConfig = [
    { angle: 70, left: false, heightOnParent: 0.7 },
    { angle: 60, left: true, heightOnParent: 0.5 },
    { angle: 65, left: false, heightOnParent: 0.6 },
    { angle: 55, left: true, heightOnParent: 0.4 },
    { angle: 75, left: false, heightOnParent: 0.3 },
    { angle: 80, left: true, heightOnParent: 0.2 },
    { angle: 85, left: false, heightOnParent: 0.5 },
    { angle: 90, left: true, heightOnParent: 0.35 },
    { angle: 95, left: false, heightOnParent: 0.4 },
    { angle: 50, left: true, heightOnParent: 0.25 },
  ];

  function Tree(opts) {
    opts = opts || {};
    this.parent = opts.parent;

    if (this.parent) {
      this.depth = this.parent.depth + 1;
      this.scale = this.parent.scale;
    } else {
      this.depth = 0;
      this.scale = opts.scale || 1;
    }

    this.x = opts.x || 0;
    this.y = opts.y || 0;

    const config = treeConfig[this.depth % treeConfig.length] || {};
    this.angle = config.angle || 70;
    this.left = config.left ?? Math.random() > 0.5;
    this.heightOnParent = config.heightOnParent ?? 0.5;

    // Use count dynamically for initial size
    const initialSize = Math.min(
      Math.max(parseFloat(localStorage.getItem('treeSize')) || (MAX_SIZE * count / 2500)),
      MAX_SIZE / 2
    );
    this.size = Math.max(initialSize, opts.size || 1);  // Ensure size does not fall below 1
    this.newBranchSize = NEW_BRANCH * this.scale;
    this.branches = [];
    this.maxSize = MAX_SIZE * MAX_DEPTH * this.scale * 2;

    this.life = 0;

    // Set colors
    this.leafRGB = { r: 220, g: 220, b: 220 };
    this.brownRGB = { r: 169, g: 169, b: 169 };

    this.cachedCanvas = $('<canvas></canvas>')[0];
    this.cachedCtx = this.cachedCanvas.getContext('2d');
    this.cachedCanvas.width = this.maxSize;
    this.cachedCanvas.height = this.maxSize;

    this.$this = $(this);

    this.$this.on('hit', (e, data) => {
      this.water(1 + data.speed / 3);
    });
  }

  Tree.prototype.getLife = function () {
    if (this.parent) return this.parent.getLife();
    return this.life;
  };

  Tree.prototype.blendColor = function () {
    var gLife = this.getLife(),
      bLife = 1 - gLife,
      r = gLife * this.leafRGB.r + bLife * this.brownRGB.r,
      g = gLife * this.leafRGB.g + bLife * this.brownRGB.g,
      b = gLife * this.leafRGB.b + bLife * this.brownRGB.b;
    return { r: r, g: g, b: b };
  };

  Tree.prototype.trigger = function (eventType, data) {
    this.$this.trigger(eventType, data);
  };

  Tree.prototype.isInTree = function (x, y) {
    var thisX = this.x - this.maxSize / 2,
      thisY = this.y - this.maxSize,
      pixel;

    if (
      x > thisX &&
      x < thisX + this.maxSize &&
      y > thisY &&
      y < thisY + this.maxSize
    ) {
      pixel = this.cachedCtx.getImageData(x - thisX, y - thisY, 1, 1).data;
      return pixel[3] > 0;
    }
    return false;
  };

  Tree.prototype.cachedRender = function (ctx) {
    this.cachedCtx.clearRect(0, 0, this.maxSize, this.maxSize);

    this.cachedCtx.save();
    this.cachedCtx.translate(this.maxSize / 2, this.maxSize);
    this.renderToCanvas(this.cachedCtx);
    this.cachedCtx.restore();

    ctx.drawImage(this.cachedCanvas, this.x - this.maxSize / 2, this.y - this.maxSize);
  };

  Tree.prototype.addBranch = function (opts) {
    opts.parent = this;
    this.branches.push(new Tree(opts));
  };

  Tree.prototype.sprout = function () {
    const config = treeConfig[(this.depth + 1) % treeConfig.length] || {};

    // Alternate the direction for each branch
    this.addBranch({
      heightOnParent: config.heightOnParent || 0.5,
      left: !this.left,  // Alternate branching direction
    });
  };

  Tree.prototype.water = function (amount) {
    if (this.parent) this.parent.water(amount);
    else this.life = Math.min(1, this.life + amount * 0.1);
  };

  Tree.prototype.grow = function (delta, giveLife) {
    var maxSize = this.parent ? this.parent.size * 0.8 : MAX_SIZE * this.scale,
      growthRate = this.getLife() * delta * 1.25; // Reduced growth rate to promote branching
    this.size = Math.min(this.size + growthRate * this.scale, maxSize);

    // Save the current size to local storage
    if (!this.parent) localStorage.setItem('treeSize', this.size);

    if (!this.parent) this.life = Math.max(0, this.life - delta * 0.1);

    if (Math.floor(this.size) >= this.newBranchSize * (this.branches.length + 1) && this.depth < MAX_DEPTH) {
      this.sprout();
    }

    for (var i = 0; i < this.branches.length; ++i) this.branches[i].grow(delta);
  };

  Tree.prototype.render = function (ctx) {
    if (this.parent) {
      ctx.save();
      ctx.translate(this.x, this.y);
      this.renderToCanvas(ctx);
      ctx.restore();
    } else {
      this.cachedRender(ctx);
    }
  };

  Tree.prototype.renderToCanvas = function (ctx) {
    var halfSize = this.size / 2,
      height = -this.size * 5,
      leafSize = this.size * 2,
      branch;

    // Set trunk and branch gradient color
    ctx.fillStyle = createTrunkGradient(ctx, this.size);
    ctx.fillRect(-halfSize, 0, this.size, height);

    ctx.save();
    ctx.translate(0, height);
    ctx.fillStyle = createRadialGradient(ctx, leafSize, this.blendColor());
    ctx.beginPath();
    ctx.arc(0, 0, leafSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    for (var i = 0; i < this.branches.length; ++i) {
      branch = this.branches[i];

      ctx.save();
      ctx.translate(0, height * branch.heightOnParent);
      if (branch.left) ctx.rotate(-this.angle * Math.PI / 180);
      else ctx.rotate(this.angle * Math.PI / 180);
      branch.render(ctx);
      ctx.restore();
    }
  };

  function createTrunkGradient(ctx, size) {
    var trunkGrd = ctx.createLinearGradient(-size / 2, 0, size / 2, 0);
    trunkGrd.addColorStop(0, 'rgb(169, 169, 169)');
    trunkGrd.addColorStop(0.5, 'rgb(128, 128, 128)');
    trunkGrd.addColorStop(1, 'rgb(169, 169, 169)');
    return trunkGrd;
  }

  window.Tree = Tree;
})();
