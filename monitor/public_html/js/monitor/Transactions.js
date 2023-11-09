//const HTML_TRANSACTIONS_TBODY_ID = "transactionsTbody";
export class Transactions {
    constructor(_tableid){
        this.transactionsList = new Array();
        this.activeSubscriptions = {};
        this.tableid=_tableid;
        //this.tableid="transactionsTbody";
    }

    transactionSubscriber(mqttBridge, containerSku)
    {
      //  console.log('Transaction suscribing!!',mqttBridge);
        if(!this.activeSubscriptions[containerSku])
        {
            this.activeSubscriptions[containerSku] = containerSku;
            console.log('Transaction susbscribing!!', containerSku);
            mqttBridge.subscribe(`containers/${containerSku}/transaction`, this.onContainerTransaction.bind(this));
        }

    }

    onContainerTransaction(jsonmessage)
    {
        console.log('***CONTAINER V2 TRANSACTION***');
        console.log(jsonmessage);
        let data = JSON.parse(jsonmessage);

        console.log(jsonmessage);
        //is not an empty array
        if(Array.isArray(data))
        {
            // format DB transactions
            if(data.length !== 0)
            {
                data.forEach(element => {
                    console.log(element)
                    let container = this.formatDBTransactionToObject(element);
                    this.transactionsList.push(container);
                    //this.addToTransactionsTable(container);
                });
                this.orderTransactionList();
                this.refreshTransactionTable();
            }
        }
        else
        {
            let containerNum = $(`#container-1-data`).data("sku") == data.sku ? $(`#container-1-data`).data("num") :  $(`#container-2-data`).data("num");
            console.log("CONTAINER NUM: ", containerNum);
            data.productName = $(`#container-${containerNum}-product`).text();
            data.productPrice = Number(data.amount).toFixed(2);
            data.datetime_id=data.date+data.time;
            this.transactionsList.unshift(data);
            this.orderTransactionList();
            //this.transactionsList.push(data);
            this.addToTransactionsTable(data);
            audios.kaching.play();

            //this.refreshTransactionTable();
        }
    }

    orderTransactionList()
    {
        this.transactionsList.sort((a, b) => a.datetime_id - b.datetime_id);
    }

    refreshTransactionTable()
    {
        console.log('Refresh transaction table ',this.transactionsList);
        $(`#${this.tableid}`).html("");
        this.transactionsList.forEach(element => {
            this.addToTransactionsTable(element);
        });
    }

    formatTransactionTimestamp(date, time)
    {
        let year =  date.slice(0, 4);
        let month = date.slice(4, 6);
        let day =   date.slice(6, 8);
        let hour =  time.slice(0, 2);
        let min =   time.slice(2, 4);
        let seg =   time.slice(4, 6);
      //  return `${year}-${month}-${day} ${hour}:${min}:${seg}`;
        return `${hour}:${min}`;
    }

    addToTransactionsTable(data)
    {
        console.log('Add to transactions ',data);
        var statusText;
        if(data.status=="approved")
          statusText="&#9989;";
        else {
          statusText="&#10060;";

        }
        $(`#${this.tableid}`).prepend( "<tr>"+
        "<td>" + data.sku + "</td>" +
        "<td> <span>" +statusText+"</span>"+this.formatTransactionTimestamp(data.date, data.time) + "</td>" +
        "</tr>");
      /*  $(`#${this.tableid}`).prepend( "<tr>" +
        "<td>" + data.id + "</td>" +
        "<td>" + data.sku + "</td>" +
        "<td>" + data.productName + "</td>" +
        "<td>" + data.productPrice + "</td>" +
        "<td>" + this.formatTransactionTimestamp(data.date, data.time) + "</td>" +
        "</tr>");*/
    }

    extractDateFromTimestamp(timestamp)
    {
        let datetime = timestamp.split('T');
        return datetime[0].replaceAll("-", "");
    }

    extractTimeFromTimestamp(timestamp)
    {
        let time = timestamp.split('T')[1];

        if(!time.includes("."))
        {
            return time;
        }

        return time.split('.')[0].replaceAll(":", "");
    }

    timestampToHumanFormat(timestamp)
    {
        let datetime = timestamp.split('T');
        let date = datetime[0];
        let time = datetime[1];

        if(time.includes("."))
        {
            time = time.split('.')[0];
        }
        return `${date} ${time}`;
    }

    formatDBTransactionToObject(transaction)
    {
        let transactionData =
        {
            "num" :             transaction.CONTAINER_NUM,
            "amount" :          transaction.TRANSACTION_AMOUNT,
            "approval_num" :    transaction.TRANSACTION_ID,
            "date" :            this.extractDateFromTimestamp(transaction.CREATED_AT),
            "detail" :          transaction.STATUS,
            "id" :              transaction.ID,
            "is_mock" :         transaction.STATUS === 'testing'? true : false,
            "reference_num" :   transaction.REFERENCE_NUMBER,
            //serial :          transaction.;
            "sku" :             transaction.CONTAINER_SKU,
            "status" :          transaction.STATUS,
            "time" :            this.extractTimeFromTimestamp(transaction.CREATED_AT),
            "time_zone" :       transaction.TIMEZONE,
            "productName":      transaction.PRODUCT_NAME,
            "productPrice":     transaction.custom_price === 0 ? transaction.PRICE : transaction.custom_price,
            "datetime_id":      (this.extractDateFromTimestamp(transaction.CREATED_AT) + this.extractTimeFromTimestamp(transaction.CREATED_AT))
        };

        return transactionData;
    }

}
