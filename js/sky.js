(function () {
  function Sky(canvas, dropper) {
    this.canvas = canvas;
    this.dropper = dropper;
    this.clouds = [];

  }

  Sky.prototype.render = function (ctx) {
    for (var i = 0; i < this.clouds.length; ++i)
      this.clouds[i].render(ctx);
  };

  Sky.prototype.update = function (delta) {
    var toDelete = [];
    for (var i = 0; i < this.clouds.length; ++i) {
      if (this.clouds[i].update(delta))
        toDelete.push(this.clouds[i]);
    }

  };


  window.Sky = Sky;
})();
