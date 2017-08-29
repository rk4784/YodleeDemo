var YDLDemoApp = angular.module('FL', ['ngRoute', 'ui.router', 'angucomplete-alt']);
var url = {
    'YSLUrl': properties.baseURL,
    'cobrandLoginUrl': 'cobrand/login',
    'userLoginUrl': 'user/login',
    'getTokenUrl': 'user/accessTokens?appIds=10003600',
    'getListofAccounts': 'accounts'
};
var cobSessionToken;
var userSessionToken;
YDLDemoApp.config(function($routeProvider, $stateProvider, $urlRouterProvider) {

    $routeProvider

        .when('/home', {
            templateUrl: 'pages/home.html',
            controller: 'homeController'
        })

        .otherwise({
            templateUrl: 'pages/home.html',
            controller: 'homeController'
        });

});

YDLDemoApp.controller('homeController', function($scope, $location, $timeout, YDLService, $rootScope) {
    $scope.linkAccountButtonDisable = true;
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd
    }
    if (mm < 10) {
        mm = '0' + mm
    }
    todayDate = yyyy + '-' + mm + '-' + dd;

    var d = new Date(todayDate);
    d.setMonth(d.getMonth() - 5);
    var oldmm = d.getMonth() + 1;
    if (oldmm < 10) {
        oldmm = '0' + oldmm
    }
    var yyyyy = d.getFullYear();
    var oldDate = yyyyy + '-' + oldmm + '-01';
    $('.modal').modal();
    $('.modal').modal({
        dismissible: false
    });
    $location.search('status', null);
    $('.modal-overlay').remove();
    cobrandLogin();

    function cobrandLogin() {

        var cobrandLoginParams = {
            'cobrandLogin': properties.cobrandParam.cobrand.cobrandLogin,
            'cobrandPassword': properties.cobrandParam.cobrand.cobrandPassword
        };

        YDLService.cobrandLoginService(url.YSLUrl + url.cobrandLoginUrl, cobrandLoginParams).then(function(data) {
                cobSessionToken = data.data.session.cobSession;
                $scope.userLogin();
            },
            function(e) {
                alert('Cobrand Login Failed:======', JSON.stringify(e));
            });
    };

    $scope.userLogin = function() {

        var headers = 'cobSession=' + cobSessionToken;
        var userLoginParams = {
            'loginName': properties.userParam.user.loginName,
            'password': properties.userParam.user.password
        };

        YDLService.userLoginService(url.YSLUrl + url.userLoginUrl, userLoginParams, headers).then(function(data) {
                userSessionToken = data.data.user.session.userSession;
                $scope.getToken();
            },
            function(e) {
                alert('User Login Failed:======', JSON.stringify(e));
            });
    };

    $scope.getToken = function() {

        var getTokenParams = {
            'appIds': '10003600'
        };
        var getTokenHeaders = '{cobSession=' + cobSessionToken + ',userSession=' + userSessionToken + '}';

        YDLService.postRequest(url.YSLUrl + url.getTokenUrl, getTokenParams, getTokenHeaders).then(function(data) {
                Token = data.data.user.accessTokens[0].value;
                $scope.showAllData = true;
                $scope.getListofAccounts();
                $scope.getListofExpense();
                $scope.getListofTransactions();
                $scope.linkAccountButtonDisable = false;
            },
            function(e) {
                alert("Get Token Failed:====" + JSON.stringify(e));
            });
    };


    $scope.getListofAccounts = function() {

        var getListofAccountsHeaders = '{cobSession=' + cobSessionToken + ',userSession=' + userSessionToken + '}';
        var getListofAccountsParams = {

        };
        var AccountsArray = {};

        YDLService.postRequest(url.YSLUrl + url.getListofAccounts, getListofAccountsParams, getListofAccountsHeaders).then(function(dataa) {

            $scope.accounts_show = true;
            var data = dataa.data.account;

            data.forEach(function(account, index) {
                if ((account && account.accountNumber) && (account && account.balance)) {
                    if (AccountsArray[account.providerName] === undefined) {
                        AccountsArray[account.providerName] = {};
                        AccountsArray[account.providerName]["bankName"] = account.providerName;
                        AccountsArray[account.providerName]["details"] = [];
                    }
                    var holderName = account.providerName;
                    if (account && account.holderProfile && account.holderProfile[0].name && account.holderProfile[0].name.displayed) {
                        holderName = account.holderProfile[0].name.displayed;
                    } else if (account && account.holderProfile && account.holderProfile[0].name && account.holderProfile[0].name.fullName) {
                        holderName = account.holderProfile[0].name.fullName;
                    }
                    var accountNumber1 = account.accountNumber.toString();
                    var account_number = accountNumber1.substr(accountNumber1.length - 4);
                    AccountsArray[account.providerName]["details"].push({
                        "bankName": account.providerName,
                        'accountType': account.accountType,
                        'balance': account.balance.amount,
                        'holderName': holderName,
                        'account_number': account_number
                    });
                } else {
                    // console.log('No account');
                }
            });
            $scope.ListofAccountArray = AccountsArray;
        });
    };

    $scope.getListofExpense = function() {

        var getListofExpenseDataParams = {

        };
        var getListofExpenseDataHeaders = '{cobSession=' + cobSessionToken + ',userSession=' + userSessionToken + '}';

        YDLService.postRequest('https://developer.api.yodlee.com/ysl/restserver/v1/transactions?baseType=DEBIT&fromDate=' + oldDate + '&toDate=' + todayDate, getListofExpenseDataParams, getListofExpenseDataHeaders).then(function(dataa) {

            $scope.expenseChart_show = false;

            var data = dataa.data.transaction;
            var monthlyExpenseList = {};
            var monthlyExpenseChartData = [];
            var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            data.forEach(function(transaction) {
                var monthName = monthNames[new Date(transaction.date).getMonth()];
                if (monthlyExpenseList[monthName] === undefined) {
                    monthlyExpenseList[monthName] = 0;
                }
                monthlyExpenseList[monthName] += transaction.amount.amount;
            });

            for (var monthName in monthlyExpenseList) {
                monthlyExpenseChartData.push({
                    "name": monthName,
                    "y": monthlyExpenseList[monthName]
                });
            };

            monthlyExpenseChartData.sort(function(a, b) {
                return monthNames.indexOf(a.name) - monthNames.indexOf(b.name);
            });

            var avgLastThreeMonthArrayCount = 0;
            for (var i = 2; i < monthlyExpenseChartData.length; i++) {
                if (i != monthlyExpenseChartData.length - 1) {
                    avgLastThreeMonthArrayCount += monthlyExpenseChartData[i].y;
                };
            };
            var avgLastThreeMonthArrayCountTotal = avgLastThreeMonthArrayCount / 3;

            Highcharts.chart('ExpenseAnalysisChart', {
                chart: {
                    type: 'column',
                    style: {
                        fontFamily: 'ProximaNovaRegular, Roboto, sans-serif'
                    }
                },
                title: {
                    text: monthlyExpenseChartData[monthlyExpenseChartData.length - 1].name + " " + new Date().getFullYear(),
                    style: {
                        fontFamily: 'ProximaNovaSemiBold',
                        fontSize: '16px',
                        color: '#4e4945'
                    }
                },
                subtitle: {
                    text: '$' + monthlyExpenseChartData[monthlyExpenseChartData.length - 1].y,
                    style: {
                        fontFamily: 'ProximaNovaSemiBold',
                        fontSize: '20px',
                        color: '#1e1d1c'
                    }
                },
                xAxis: {
                    type: 'category',
                    title: {
                        text: 'AVG. FOR LAST 3 MONTHS: $' + avgLastThreeMonthArrayCountTotal.toFixed(2),
                        style: {
                            fontFamily: 'ProximaNovaSemiBold'
                        }
                    }
                },
                yAxis: {
                    title: {
                        text: ''
                    }

                },

                legend: {
                    enabled: false
                },
                colors: ['#E53935', '#E53935', '#E53935', '#E53935', '#E53935', '#F29C9A'],
                plotOptions: {
                    series: {
                        color: '#FF0000',
                        borderWidth: 0,
                        dataLabels: {
                            enabled: false,
                            format: '${point.y}'
                            // format: '{point.y:.1f}%'
                        }
                    }
                },
                credits: {
                    enabled: false
                },
                tooltip: {
                    enabled: true,
                    headerFormat: '',
                    pointFormat: '</span>${point.y:.2f}<br/>'
                },

                series: [{
                    name: 'Debit',
                    colorByPoint: true,
                    data: monthlyExpenseChartData
                }]
            });

        }, function(e) {
            alert(JSON.stringify(e));
        });
    };

    $scope.getListofTransactions = function() {

        var TransactionsDataArray = {};
        var getExpenseDataParams = {

        };
        var getExpenseDataHeaders = '{cobSession=' + cobSessionToken + ',userSession=' + userSessionToken + '}';
        YDLService.postRequest('https://developer.api.yodlee.com/ysl/restserver/v1/transactions?fromDate=' + oldDate + '&toDate=' + todayDate, getExpenseDataParams, getExpenseDataHeaders).then(function(dataa) {
            $scope.transaction_show = true;
            var data = dataa.data.transaction;
            getTransactionsDataa = data;
            data.forEach(function(transaction) {
                if (TransactionsDataArray[transaction.date] === undefined) {
                    TransactionsDataArray[transaction.date] = {};
                    TransactionsDataArray[transaction.date]["date"] = transaction.date;
                    TransactionsDataArray[transaction.date]["details"] = [];
                };
                TransactionsDataArray[transaction.date]["details"].push({
                    'baseType': transaction.baseType,
                    'category': transaction.category,
                    'amount': transaction.amount.amount,
                    'account_number': '3009',
                    'description': transaction.description.original
                });
            });
            $scope.postedTranscation = TransactionsDataArray;

        }, function(e) {
            alert("Get Transactions Failed:=======" + JSON.stringify(e));
        })
    };

    $scope.LinkAccountButtonClicked = function() {

        var iframe = document.createElement('iframe');
        iframe.height = "100%";
        iframe.width = "100%";
        var html = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN"><HTML><HEAD><script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js"></script></HEAD><BODY><form action="' + properties.Urls.finApp + '" method="post" style="display:none;">User Session: <input type="text" name="rsession" value="' + userSessionToken + '"><br><br> User Token:<input type="text" name="token" value="' + Token + '"><input type="text" name="extraParams" value="&callback=http://localhost/FL2.2/#/modal1&cbLocation=top"><br><br> App ID:<input type="text" name="app" value="10003600"><br><br> Request Redirect:<input type="text" name="redirectReq" value="true"><<br><br><input type="submit" value="Submit"></form><script type="text/javascript">window.document.forms[0].submit();</script></body></html>';
        iframe.src = 'data:text/html;charset=utf-8,' + encodeURI(html);
        var a = document.getElementById("FLDiv");
        a.appendChild(iframe)

    };


});
YDLDemoApp.service('YDLService', function($http) {
    return {
        cobrandLoginService: (function(url, response) {
            return $http({
                method: 'POST',
                url: url,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                transformRequest: function(obj) {
                    var str = [];
                    for (var p in obj)
                        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                    return str.join("&");
                },
                data: response
            })

        }),
        userLoginService: (function(url, response, headers) {
            return $http({
                method: 'POST',
                url: url,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': headers
                },
                transformRequest: function(obj) {
                    var str = [];
                    for (var p in obj)
                        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                    return str.join("&");
                },
                data: response
            })

        }),
        postRequest: (function(url, response, headers) {
            return $http({
                method: 'GET',
                url: url,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': headers
                },
                transformRequest: function(obj) {
                    var str = [];
                    for (var p in obj)
                        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                    return str.join("&");
                },
                data: response
            })

        })
    };

});