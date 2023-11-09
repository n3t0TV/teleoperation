import { AFB } from "../audio/AudioFeedback.js";
import { Transactions } from './Transactions.js'

let timedEvent = false;
let quantityTimeout1 = false;
let quantityTimeout2 = false;

const CONTAINER_HOLDTIME = 700;
const isNullOrUndefined = value => value === null || value === undefined;

export class monitorContainer {
  constructor(monitor) {
    this.monitor = monitor;
    this.sku1 = false;
    this.sku2 = false;
    this.transactionList = [];
    this.containersTransactions = false;
  }

  suscribeContainers() {
    this.monitor.vehicleMqtt.subscribe(`containers/all/update`, this.oncontainersupdate.bind(this));
  }

  oncontainertransaction(jsonmessage) {
    console.log('Transaction!!', jsonmessage);

    try {
      const transactionDict = JSON.parse(jsonmessage);
      this.addTransactionRow(transactionDict);

      var num = false;
      if (this.monitor.containersSku[1] !== undefined && transactionDict.sku == this.monitor.containersSku[1].sku) {
        num = 1;
      }
      else if (this.monitor.containersSku[2] !== undefined && transactionDict.sku == this.monitor.containersSku[2].sku) {
        num = 2;
      }

      if (num) {
        if (transactionDict.detail == 'Approved') {

          this.monitor.containers[num].card.addClass('payment-success');
          this.monitor.div.addClass('success');
          setTimeout(() => {
            this.monitor.containers[num].card.removeClass('payment-success');
            this.monitor.div.removeClass('success');
          }, 1100);
          AFB.kaching.play();
        }
        else {
          this.monitor.containers[num].card.addClass('payment-error');
          this.monitor.div.addClass('danger');
          setTimeout(() => {
            this.monitor.containers[num].card.removeClass('payment-error');
            this.monitor.div.removeClass('danger');
          }, 1100);

          AFB.wrong.play();
        }
      }
      else {
        console.log('containserSku not initialized... ');
      }
    }
    catch (e) {
      console.log(jsonmessage);
      console.error('Error parsing container sensor json', e);
    }
  }


  refreshHeartbeat(value) {

    console.log('***HEARTBEAT***', value);
    this.monitor.containersSku[value.num] = value;
    //Container panel
    this.refreshContainerDetail(value.num);
    if (this.monitor.restockPanel) {
      //Container product panel
      this.refreshProductDetail(value.num);
    }
    console.log('***HEARTBEAT FINISHED***', value);
  }

  refreshContainerDetail(num) {
    console.log('Refreshing container detail!!');
    if (this.monitor.containersSku[num]) {
      console.log('Setting sku!!')
      const sku = this.monitor.containersSku[num].sku;
      const skuDiv = this.monitor.containers[num].skuDiv;
      //Main contianer div
      skuDiv.addClass(`wagon-sku-${sku}`).addClass(`wagon-sku-info`);
      skuDiv.removeClass(`wagon-sku-${num}`);
      skuDiv.empty();
      const skuInfo = $(`<p>${sku}</p>`).appendTo(skuDiv);


      $(`#container-${num}-company`).text(this.monitor.containers[num].operatorName);
      $(`#container-${num}-product`).text(this.monitor.containers[num].productName);
      $(`#container-${num}-price`).text(this.monitor.containers[num].productPrice);
      $(`#container-${num}-sku`).text(this.monitor.containers[num].sku);
      // container-1-company
      // container-1-product
      // container-1-price

      if (this.monitor.containersSku[num].connected) {
        console.log('***CONTAINER***', num);

        if (!this.monitor.containersSku[num].lid) {
          console.log('Closed!!');
          this.monitor.containers[num].containerOpen.addClass('text-success');
          this.monitor.containers[num].containerOpen.removeClass('text-warning');
          this.monitor.containers[num].containerOpen.html(`<i class="fad fa-box"></i>`);
          this.monitor.containers[num].container.removeClass('open');

        } else {

          console.log('Open!!', num);
          this.monitor.containers[num].containerOpen.removeClass('text-success');
          this.monitor.containers[num].containerOpen.addClass('text-warning');
          this.monitor.containers[num].containerOpen.html(`<i class="fad fa-box-open"></i>`);
          this.monitor.containers[num].container.addClass('open');
        }

        console.log('Battery!!');
        if (this.monitor.containersSku[num].battery > 87) {
          this.monitor.containers[num].battery.html(`<i class="fad fa-battery-full"></i>`).removeClass().addClass('wagon-container-battery  text-success');
        } else if (this.monitor.containersSku[num].battery > 62) {
          this.monitor.containers[num].battery.html(`<i class="fad fa-battery-three-quarters"></i>`).removeClass().addClass('wagon-container-battery  text-success');
        } else if (this.monitor.containersSku[num].battery > 37) {
          this.monitor.containers[num].battery.html(`<i class="fad fa-battery-half"></i>`).removeClass().addClass('wagon-container-battery  text-success');
        } else if (this.monitor.containersSku[num].battery > 12) {
          this.monitor.containers[num].battery.html(`<i class="fad fa-battery-quarter"></i>`).removeClass().addClass('wagon-container-battery  text-warning');
        } else {
          this.monitor.containers[num].battery.html(`<i class="fad fa-battery-empty"></i>`).removeClass().addClass('wagon-container-battery  text-danger');
        }
        this.monitor.containers[num].battery.attr('title', `${this.monitor.containersSku[num].battery}%`);
      }
      else {

        this.monitor.containers[num].containerOpen.removeClass('text-warning');
        this.monitor.containers[num].containerOpen.removeClass('text-success');
        this.monitor.containers[num].containerOpen.removeClass('text-secondary');
        this.monitor.containers[num].containerOpen.html(`<i class="fad fa-question-square"></i>`);

        this.monitor.containers[num].battery.attr('title', ``);
        this.monitor.containers[num].battery.html('<i class="fad fa-battery-slash"></i>');
        this.monitor.containers[num].battery.removeClass().addClass('wagon-container-battery text-secondary');
      }
    }
  }

  oncontainersupdate(jsonmessage) {

    //console.log('Containers update!!');
    try {
      //console.log(jsonmessage);
      const containerArray = JSON.parse(jsonmessage);
      if (containerArray.length == 0)
        return;
      //console.log(containerArray);
      this.containersData = [];
      var k = 0;
      //  console.log('Containers length!!',containerArray);
      if (containerArray.length > 1)//Initialization (offline and online list)
      {
        //find containers with vehicle imei
        for (var i = 0; i < containerArray.length; i++) {
          if (containerArray[i].vehicleImei == this.monitor.imei) {
            const container = containerArray[i];
            this.containersData[k] = container;
            k++;
            console.log(container);
          }
        }
        console.log('Containers data!!', this.containersData.length);
        console.log("CONTAINERS DATA: ", this.containersData);
        //let index=0;
        if (this.containersData.length == 0) {
          this.monitor.restockBtn.hide();
        }

        if (!this.containersTransactions)
          this.containersTransactions = new Transactions(`transactionsTbody-${this.monitor.imei}`);
        //  console.log('Containers data!!: ',containersData);
        for (var index = 0; index < this.containersData.length; index++) {
          console.log('index!!', index);
          const value = this.containersData[index];
          //this.vehicleMqtt.subscribe(`containers/${value.sku}/sensor`, this.oncontainersensor.bind(this));
          //this.monitorContainer.suscribeContainers();
          if (value.num == 1) {
            this.sku1 = value.sku;
            this.containersTransactions.transactionSubscriber(this.monitor.vehicleMqtt, this.sku1);
          }
          else {
            this.sku2 = value.sku;
            this.containersTransactions.transactionSubscriber(this.monitor.vehicleMqtt, this.sku2);
          }
          this.refreshHeartbeat(value);
        }
      }
      else {//1 sku
        //this.containersData=[];
        var containerHeartbeat = containerArray[0];
        //console.log(this.imei);
        //console.log(this.containersData.vehicleImei);
        if (containerHeartbeat.vehicleImei == this.monitor.imei) {

          this.refreshHeartbeat(containerHeartbeat);
        }
        //online event
      }
    }
    catch (e) {
      console.error(); ('Error parsing container update json', e);
    }
  }

  setupContainerEvents() {
    for (let c in this.monitor.containers) {
      const n = c; //required for arrow keys in for
      const container = this.monitor.containers[n];

      container.containerBtn.on('click', () => {
        this.openContainer(c);
      });

    }
  }

  openContainer(id) {
    this.monitor.sendInstruction({
      command: 'ST',
      open: true,
      id: String(id)
    })

    if (this.monitor.containersSku[id] !== undefined) {
      var sku = this.monitor.containersSku[id].sku;
      console.log('Opening SKU:', sku);
      this.monitor.vehicleMqtt.publish(
        `containercontrol/${sku}`,
        JSON.stringify({
          command: "open"
        })
      );
    }
  }

  renderContainer(n) {
    const containerRender = {};

    containerRender.container = $('<div>').addClass(`wagon-container wagon-container-${n}`).appendTo(this.monitor.wagonView);
    containerRender.containerBg = $('<div>').addClass('wagon-container-bg').appendTo(containerRender.container);
    containerRender.battery = $('<div>').html('<i class="fad fa-battery-slash"></i>').addClass('wagon-container-battery text-secondary').appendTo(containerRender.container);
    containerRender.card = $('<div>').html('<i class="fad fa-credit-card"></i>').addClass('wagon-container-card text-secondary').appendTo(containerRender.container);
    containerRender.containerOpen = $('<div>').addClass('text-secondary').html('<i class="fad fa-question-square"></i>').addClass('wagon-container-box').appendTo(containerRender.container);

    containerRender.containerBtn = $('<div>').addClass('text-secondary').html('<button class="btn btn-primary btn-xsmall"><i class="fad fa-box"></i></button>').addClass("wagon-container-open").appendTo(containerRender.container);

    // containerRender.cellphoneStatus = $('<div>').html('<i class="fad fa-mobile-alt"></i>').addClass(`wagon-container-cellphone-${n} text-secondary`).appendTo(containerRender.container);
    containerRender.skuDiv = $('<div>').html('<b></b>').addClass(`wagon-sku-${n}`).appendTo(containerRender.container);
    //containerRender.sku.attr('id', `wagon-sku-${n}`);

    this.monitor.containers[n] = containerRender;
  }

  refreshProductDetail(num) {
    if (this.monitor.containersSku[num]) {
      const sku = this.monitor.containersSku[num].sku;
      const quantity = this.monitor.containersSku[num].quantity;
      const operatorName = this.monitor.containersSku[num].operatorName;
      const productName = this.monitor.containersSku[num].productName;
      const customPrice = this.monitor.containersSku[num].customPrice;
      const productPrice = this.monitor.containersSku[num].productPrice;
      const readerEnabled = this.monitor.containersSku[num].readerEnabled;
      var price;
      if (customPrice == 0) {
        price = productPrice;
      }
      else {
        price = customPrice;
      }
      console.log('Refreshing product detail!', sku, quantity, readerEnabled);
      if (!isNullOrUndefined(operatorName))
        this.monitor.containersRestock[num].operatorLabel.html(operatorName);
      if (!isNullOrUndefined(productName))
        this.monitor.containersRestock[num].productLabel.html(productName);
      if (!isNullOrUndefined(price))
        this.monitor.containersRestock[num].priceLabel.html('$' + price);

      //  if(this.monitor.containersRestock[num].quantity.html()=='')
      this.monitor.containersRestock[num].quantity.html(quantity);
      this.monitor.containersRestock[num].chargeLabel.html(sku);

      if (this.monitor.containersSku[num].connected) {
        this.monitor.containersRestock[num].chargeEnable.prop('checked', readerEnabled);
        this.monitor.containersRestock[num].chargeEnable.prop('disabled', false);
      }
      else {
        this.monitor.containersRestock[num].chargeEnable.prop('disabled', true);
      }
    }

  }

  renderContainerRestock(n) {
    const containerRestockRender = {};

    containerRestockRender.containerRestock = $('<div>').addClass(`wagon-restock-${n}`).appendTo(this.monitor.restockWagonView);
    containerRestockRender.sku = $('<div>').html('<b></b>').addClass(`wagon-sku-${n}`).appendTo(containerRestockRender.containerRestock);
    const chargeDiv = $('<div>').addClass('form-check wagon-charge').appendTo(containerRestockRender.containerRestock);

    containerRestockRender.chargeEnable = $(`<input>`).attr({
      id: `wagon-checkbox-${this.imei}-${n}`,
      type: 'checkbox',
      checked: true
      //disabled:true
    }).addClass(`wagon-payment-toggle form-check-input`).appendTo(chargeDiv);
    containerRestockRender.chargeLabel = $('<label>').attr('for', `wagon-checkbox-${this.imei}-${n}`).html('').addClass('form-check-label lb-sm').appendTo(chargeDiv);


    containerRestockRender.operatorLabel = $('<p>').html('').addClass('operator-name').appendTo(containerRestockRender.containerRestock);
    containerRestockRender.productLabel = $('<p>').html('').addClass('product-name').appendTo(containerRestockRender.containerRestock);
    containerRestockRender.priceLabel = $('<p>').html('').addClass('product-price').appendTo(containerRestockRender.containerRestock);

    containerRestockRender.chargeEnable.click((event) => {

      //event.preventDefault();
      const checked = containerRestockRender.chargeEnable.prop('checked')
      console.log(checked);

      console.log(`containercontrol/${this.monitor.containersSku[n].sku}`);
      /*  console.log(JSON.stringify({
          command: "enable",
          enable: checked
        }));*/

      this.monitor.vehicleMqtt.publish(`containercontrol/${this.monitor.containersSku[n].sku}`,

        JSON.stringify({
          command: "enable",
          enable: checked
        })
      );
      //console.log('Check click!',containerRestockRender.chargeEnable.prop('checked'));
      /*if(containerRestockRender.chargeEnable.prop('checked'))
        containerRestockRender.chargeLabel.html('$');
      else
        containerRestockRender.chargeLabel.html('$');*/

    })
    containerRestockRender.subsProductBtn = $('<button>').addClass(`wagon-product-minus btn btn-outline-danger btn-sm px-2`).html('<i class="fas fa-minus fa-xs "></i>').addClass('btn btn-default').appendTo(containerRestockRender.containerRestock);

    containerRestockRender.subsProductBtn.click(() => {
      if (this.monitor.containersSku[n]) {

        if (n == 1) {
          if (quantityTimeout1) {
            clearTimeout(quantityTimeout1)
            quantityTimeout1 = false;
          }
          quantityTimeout1 = setTimeout(() => {
            this.saveQuantity(n);
          }, 3000);
        }
        else {
          if (quantityTimeout2) {
            clearTimeout(quantityTimeout2)
            quantityTimeout2 = false;
          }
          quantityTimeout2 = setTimeout(() => {
            this.saveQuantity(n);
          }, 3000);
          //quantityTimeout2=setTimeout(this.saveQuantity.bind(this),3000);
        }
        this.monitor.containersSku[n].quantity--;
        if (this.monitor.containersSku[n].quantity < 0)
          this.monitor.containersSku[n].quantity = 0;
        containerRestockRender.quantity.html(this.monitor.containersSku[n].quantity);
        console.log('Substract from: ', this.monitor.containersSku[n]);
      }
    });
    containerRestockRender.quantity = $('<div>').html(``).addClass(`wagon-product`).appendTo(containerRestockRender.containerRestock);
    containerRestockRender.addProductBtn = $('<button>').addClass(`wagon-product-plus btn btn-outline-success btn-sm px-2`).html('<i class="fas fa-plus fa-xs"></i>').addClass('btn btn-default').appendTo(containerRestockRender.containerRestock);

    containerRestockRender.addProductBtn.click(() => {


      if (this.monitor.containersSku[n]) {

        if (n == 1) {
          if (quantityTimeout1) {
            clearTimeout(quantityTimeout1)
            quantityTimeout1 = false;
          }
          quantityTimeout1 = setTimeout(() => {
            this.saveQuantity(n);
          }, 3000);
        }
        else {
          if (quantityTimeout2) {
            clearTimeout(quantityTimeout2)
            quantityTimeout2 = false;
          }
          quantityTimeout2 = setTimeout(() => {
            this.saveQuantity(n);
          }, 3000);
          //quantityTimeout2=setTimeout(this.saveQuantity.bind(this),3000);
        }
        /*if(quantityTimeout)
        {
          clearTimeout(quantityTimeout)
        }
        quantityTimeout=setTimeout(this.saveQuantity.bind(this),3000)*/
        this.monitor.containersSku[n].quantity++;
        containerRestockRender.quantity.html(this.monitor.containersSku[n].quantity);
        console.log('Add from: ', this.monitor.containersSku[n]);
      }

    });




    this.monitor.containersRestock[n] = containerRestockRender;
  }

  saveQuantity(n) {
    console.log('Saving quantity!!');
    const item = this.monitor.containersSku[n];
    //  for (const [i, item] of Object.entries(this.monitor.containersSku))
    //  {
    const sku = item.sku;
    const quantity = item.quantity;
    console.log('updating DB', item);

    $.ajax({
      type: "GET",
      url: `/update-quantity?sku=${sku}&quantity=${quantity}`,

      success: response => {
        console.log('Quantity saved!');


      }
    });
    //  }


  }
  renderTransactionTable(imei) {
    const transactionRender = {};
    transactionRender.transactionDiv = $('<div>').addClass(`wagon-transaction`).appendTo(this.monitor.transactionView);

    const thead = $("<thead></thead>");
    // const row = $("<tr></tr>");
    // const col1 = $("<td>Transactions</td>");
    const table = $(`<table id="transactionTable-${imei}"></table>`).addClass('table transaction-row').appendTo(transactionRender.transactionDiv);

    //row.append(col1).appendTo(thead);
    thead.appendTo(table);
    this.monitor.transactionsBody = $(`<tbody id="transactionsTbody-${this.monitor.imei}"></tbody>`).addClass('transaction-body').appendTo(table);
    if (this.containersTransactions)
      this.containersTransactions.refreshTransactionTable();
  }

  addTransactionRow(data) {
    console.log("Adding transaction to list!");
    this.transactionList.unshift(data);
    console.log(this.transactionList);

    this.refreshTransactionList();
    /*
    row.append(col1).prependTo(this.monitor.transactionsBody);*/
  }

  unsuscribeContainers() {
    this.monitor.vehicleMqtt.unsubscribe(`containers/all/update/`);
    if (this.sku1 !== undefined)
      this.monitor.vehicleMqtt.unsubscribe(`containers/${this.sku1}/transaction`);
    if (this.sku2 !== undefined)
      this.monitor.vehicleMqtt.unsubscribe(`containers/${this.sku2}/transaction`);
  }


}

function animationFrame() {

  if (typeof timedEvent === 'function') {
    timedEvent();
  }

  requestAnimationFrame(animationFrame);
}

animationFrame();
