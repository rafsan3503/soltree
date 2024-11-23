(function () {
  function Dropper(canvas, forest) {
    var $canvas = $(canvas),
      that = this;

    this.mouseCoords = { x: 0, y: 0 };
    this.mouseDown = false;
    this.drops = [];
    this.canvas = canvas;
    this.forest = forest;
    this.dropCounter = 0;
    this.txCount = 0; // Initialize transaction count

    // WebSocket connection setup
    this.initWebSocket();

    // Start the interval to refresh transaction history every 1 second
    setInterval(() => this.refreshTransactionHistory(), 1000);
  }

  // Initialize WebSocket connection
  Dropper.prototype.initWebSocket = function () {
    var that = this;
    const socket = io('https://api.generativetree.xyz'); // Adjust URL to your WebSocket server

    this.transactionHistory = []; // Array to store all transactions

    socket.on('totalTxCount', (data) => {
      txCount = data.totalTxCount;  // Update count from server
    });

    // Listen for 'transactionDetected' event from the server
    socket.on('transactionDetected', function (data) {
      console.log('Transaction detected:', data.transactionId);

      // Update transaction count from server data
      that.txCount = data.totalTxCount;

      // Trigger a new drop for the transaction in the middle of the canvas
      that.drop({
        x: that.canvas.width / 2, // Center horizontally
        y: 0, // Start at the top of the canvas
        transactionId: data.transactionId, // Store transaction ID
      });

      // Update the transaction history display
      that.addTransaction(data.transactionId);
    });
  };

  // Function to add a new transaction to the history
  Dropper.prototype.addTransaction = function (transactionId) {
    const timestamp = Date.now(); // Get the current timestamp
    this.transactionHistory.unshift({ id: transactionId, time: timestamp });
  };

  // Function to refresh the transaction history display every second
  Dropper.prototype.refreshTransactionHistory = function () {
    const transactionBox = document.getElementById('transaction-box');
    const loadingBar = document.getElementById('loading-bar');

    transactionBox.innerHTML = this.transactionHistory
      .map(tx => {
        const elapsed = Math.floor((Date.now() - tx.time) / 1000); // Calculate elapsed time in seconds
        let timeAgo;

        // Determine time format (singular/plural for seconds and minutes)
        if (elapsed === 1) {
          timeAgo = "1 second ago";
        } else if (elapsed === 0) {
          timeAgo = `0 seconds ago`;
        } else if (elapsed < 60) {
          timeAgo = `${elapsed} seconds ago`;
        } else {
          const minutes = Math.floor(elapsed / 60);
          timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        }

        return `
          <div>
            <a href="https://solscan.io/tx/${tx.id}" target="_blank" style="color: #fff; text-decoration: none;">
              ${timeAgo} - ${tx.id.slice(0, 6)}...${tx.id.slice(-4)}
            </a>
          </div>
        `;
      })
      .join('');

    // Update the loading bar based on txCount received from server
    console.log('dropper', this.txCount)
    const progress = Math.floor((this.txCount / 2500) * 100); // Cap at 100%
    console.log(progress)
    loadingBar.style.width = `${progress}%`;
  };


  Dropper.prototype.render = function (ctx) {
    for (var i = 0; i < this.drops.length; ++i)
      this.drops[i].render(ctx);
  };

  Dropper.prototype.drop = function (opts) {
    opts.maxHeight = this.canvas.height;
    this.drops.push(new Drop(opts));
  };

  Dropper.prototype.update = function (delta, ctx) {
    var toDelete = [];

    this.dropCounter += delta;

    for (var i = 0; i < this.drops.length; ++i) {
      if (this.drops[i].fall(delta, this.forest))
        toDelete.push(this.drops[i]);
    }

    this.drops = _.difference(this.drops, toDelete);

    if (!this.mouseDown) return;

    if (this.dropCounter > 0.1) {
      this.drop({ x: this.mouseCoords.x, y: this.mouseCoords.y });
      this.dropCounter = 0;
    }
  };

  window.Dropper = Dropper;
})();
