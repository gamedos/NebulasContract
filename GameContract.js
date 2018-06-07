"use strict";

var Donor = function (text) {
	if (text) {
		var donor = JSON.parse(text);
		this.address = donor.address;
		this.title = donor.title;			//捐赠名字
		this.url = donor.url;			//url链接
		this.imgUrl = donor.imgUrl;	//图片
		this.donation = donor.donation; //捐赠金额
		this.id = donor.id;
	} else {
		this.address = '';
		this.title = '';			//捐赠名字
		this.url = '';			//url链接
		this.imgUrl = '';		//图片
		this.donation = new BigNumber(0); //捐赠金额
		this.id = '';
	}
};

Donor.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};

var Player = function (text) {
	if (text) {
		var player = JSON.parse(text);
		this.address = player.address;
		this.name = player.name;
		this.maxscore = player.maxscore;
		this.time = player.time;
		this.count = player.count;
	} else {
		this.address = '';
		this.name = '';
		this.maxscore = 0;
		this.time = '';
		this.count = 0;
	}
};

Player.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};


var GameContract = function () {
	//所有用户  地址：用户
	LocalContractStorage.defineMapProperty(this, "allPlayer", {
		parse: function (text) {
			return new Player(text);
		},
		stringify: function (o) {
			return o.toString();
		}
	});

	//日榜 5位 结构 1:user1 2:user2  
	LocalContractStorage.defineMapProperty(this, "dayRank", {
		parse: function (text) {
			return new Player(text);
		},
		stringify: function (o) {
			return o.toString();
		}
	});

	//周榜 5位 结构 1:user1 2:user2  
	LocalContractStorage.defineMapProperty(this, "weekRank", {
		parse: function (text) {
			return new Player(text);
		},
		stringify: function (o) {
			return o.toString();
		}
	});

	//月榜 5位 结构 1:user1 2:user2  
	LocalContractStorage.defineMapProperty(this, "monthRank", {
		parse: function (text) {
			return new Player(text);
		},
		stringify: function (o) {
			return o.toString();
		}
	});



	//捐赠 数据
	LocalContractStorage.defineMapProperty(this, 'donorList', {
		stringify: function (obj) {
			return obj.toString();
		},
		parse: function (str) {
			return new Donor(str);
		}
	});

	LocalContractStorage.defineProperty(this, "count");
	LocalContractStorage.defineProperty(this, "people");
	LocalContractStorage.defineProperty(this, "rewardCount");

	LocalContractStorage.defineProperty(this, "balance");
	LocalContractStorage.defineProperty(this, "admin");
	LocalContractStorage.defineProperty(this, "donationCount");
	
	LocalContractStorage.defineProperty(this, "privateKey");

};

GameContract.prototype = {
	init: function () {
		// todo
		this.count = 0;
		this.people = 0;
		this.rewardCount = 0;
		this.admin = "n1aHnQ876UBCBmQ3ynQ3mEsvto6kZEU4tTW";
		this.balance = new BigNumber(0);
		this.donationCount = 0;
		this.privateKey = '';
	},
	
	adminConfig: function(privateKey){
		var frome = Blockchain.transaction.from;
		if(frome != this.admin){
			throw new Error("you have no premisson");
		}
		this.privateKey = privateKey;
	},
	
	//记录游戏
	recordGame: function (name, score, privateKey) {
		if(this.privateKey != '' && this.privateKey != privateKey){
			throw new Error("you have no premisson");
		}
		
		//检查是否有可清空的榜单
		this._clearRank();
		var address = Blockchain.transaction.from;
		var player = this.allPlayer.get(address);
		if (player) {
			if (player.maxscore >= score) {
				throw new Error("你历史最高分大于当前分数");
			}
		} else {
			player = new Player();
			player.address = address;
			this.people += 1;
		}
		player.name = name;
		player.maxscore = score;
		player.count += 1;
		var date = new Date();
		player.time = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
		this.allPlayer.set(address, player);
		this.count += 1;

		//计入榜单
		this._caclulateRank(this.dayRank, player);
		this._caclulateRank(this.weekRank, player);
		this._caclulateRank(this.monthRank, player);

	},

	//计算榜单
	_caclulateRank: function (rankData, player) {
		//计入榜单
		var rank_arr = [];
		for (var i = 0; i < 5; i++) {
			var rank_player = rankData.get(i);
			if (!rank_player) {
				break;
			}
			if (player.address != rank_player.address) {
				rank_arr.push(rank_player);
			}
		}
		//榜单数据小于 5
		if (rank_arr.length == 0) {
			rankData.set(rank_arr.length, player);
		} else if (rank_arr.length == 5 && rank_arr[rank_arr.length - 1].maxscore >= player.maxscore) {
			return;
		} else {
			//最后一名得分小于 当前玩家得分
			rank_arr.push(player);
			rank_arr.sort(function (a, b) { a.maxscore > b.maxscore });

			for (var i = 0; i < 5; i++) {
				if (i < rank_arr.length) {
					var day_player = rank_arr[i];
					rankData.set(i, day_player);
				}
			}
		}
	},


	//获取日榜单
	getDayRank: function () {
		return this.dayRank;
	},

	//获取游戏信息
	getGameInfo: function () {
		return {
			balance: this.balance,
			dayRank: this.getDayRank(),
			weekRank: this.getWeekRank(),
			monthRank: this.getMonthRank(),
			donorList: this.getDonorList(),
			gameCount: this.count,
			total_player: this.people,
			rewardCount: this.rewardCount,
			donationCount: this.donationCount

		};
	},
	//获取最高分
	getPlayerInfo: function () {
		var address = Blockchain.transaction.from;
		var player = this.allPlayer.get(address);
		if (!player) {
			throw new Error("你还没有历史记录哦");
		}
		return player;
	},
	
	_clearRankData: function(rankData){
		for (var i = 0; i < 5; i++) {
				var clear_player = rankData.get(i);
				if(!clear_player){
					break;
				}
				rankData.set(i, null);
		}
	},
	//清空榜单
	_clearRank: function () {
		var date = new Date();
		//榜单第一名时间  日 < 当前日
		var day_player = this.dayRank.get('0');
		if (!day_player) {
			return;
		}
		var day_date = new Date(day_player.time);

		if (date.getDay() != day_date.getDay()) {
			//清空日榜
			var first_player = this.dayRank.get('0');
			if (first_player) {
				this._reward(first_player, 1);
			}
			this._clearRankData(this.dayRank);
		}

		var week_player = this.weekRank.get('0');
		var week_date = new Date(week_player.time);


		if (week_date.getDay() != 0 && date.getDay() == 0) {
			//清空周榜
			var first_player = this.weekRank.get('0');
			if (first_player) {
				this._reward(first_player, 2);
			}
			this._clearRankData(this.weekRank);
		}

		var month_player = this.monthRank.get('0');
		var month_date = new Date(month_player.time);
		if (date.getMonth() != day_date.getMonth()) {
			//清空月榜
			var first_player = this.monthRank.get('0');
			if (first_player) {
				this._reward(first_player, 3);
			}
			this._clearRankData(this.monthRank);
		}
	},

	//奖励 type 1 天 2周  3月
	_reward: function (player, type) {
		var to = player.address;
		//规则 日榜：5%  周榜：10% 月榜：20%
		var reward = new BigNumber(0);
		if (type == 1) {
			reward = new BigNumber(this.balance).mul(0.05);
		} else if (type == 2) {
			reward = new BigNumber(this.balance).mul(0.1);
		} else if (type == 3) {
			reward = new BigNumber(this.balance).mul(0.2);
		}

		var result = Blockchain.transfer(to, reward);

		if (!result) {
			throw new Error("GetNas transfer failed. value:" + nas);
		}

		this.balance = new BigNumber(this.balance).minus(reward);

		this.rewardCount += 1;
	},

	getDayRank: function () {
		var arr = [];
		for (var i = 0; i < 5; i++) {
			var player = this.dayRank.get(i);
			if (!player) {
				break;
			}
			arr.push(player);
		}
		return arr.reverse();
	},

	getWeekRank: function () {
		var arr = [];
		for (var i = 0; i < 5; i++) {
			var player = this.dayRank.get(i);
			if (!player) {
				break;
			}
			arr.push(player);
		}
		return arr.reverse();
	},

	getMonthRank: function () {
		var arr = [];
		for (var i = 0; i < 5; i++) {
			var player = this.dayRank.get(i);
			if (!player) {
				break;
			}
			arr.push(player);
		}
		return arr.reverse();
	},

	getDonorList: function () {
		var arr = [];
		for (var i = 0; i < this.donationCount; i++) {
			arr.push(this.donorList.get(i));
		}
		return arr.reverse();
	},

	getPlayer: function (address) {
		if (!address) {
			address = Blockchain.transaction.from;
		}
		var player = this.allPlayer.get(address);

		return player;
	},


	//捐赠
	donation: function (title, desc, imgUrl, url) {

		var address = Blockchain.transaction.from;
		var value = Blockchain.transaction.value;
		var id = this.donationCount;

		var donor = new Donor();
		donor.address = address;
		donor.donation = value;
		donor.id = id;
		donor.title = title;
		donor.desc = desc;
		donor.imgUrl = imgUrl;
		donor.url = url;
		this.donorList.set(id, donor);

		this.donationCount += 1;
		this.balance = value.plus(this.balance);
		return true;
	}
}

module.exports = GameContract;
