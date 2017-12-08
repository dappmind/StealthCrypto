pragma solidity ^0.4.13;

contract ERC20 {
  function balanceOf(address who) constant returns (uint);
  function allowance(address owner, address spender) constant returns (uint);

  function transfer(address to, uint value) returns (bool ok);
  function transferFrom(address from, address to, uint value) returns (bool ok);
  function approve(address spender, uint value) returns (bool ok);
  event Transfer(address indexed from, address indexed to, uint value);
  event Approval(address indexed owner, address indexed spender, uint value);
}

//Safe math
contract SafeMath {
  function safeMul(uint a, uint b) internal returns (uint) {
    uint c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function safeDiv(uint a, uint b) internal returns (uint) {
    assert(b > 0);
    uint c = a / b;
    assert(a == b * c + a % b);
    return c;
  }

  function safeSub(uint a, uint b) internal returns (uint) {
    assert(b <= a);
    return a - b;
  }

  function safeAdd(uint a, uint b) internal returns (uint) {
    uint c = a + b;
    assert(c>=a && c>=b);
    return c;
  }

  function max64(uint64 a, uint64 b) internal constant returns (uint64) {
    return a >= b ? a : b;
  }

  function min64(uint64 a, uint64 b) internal constant returns (uint64) {
    return a < b ? a : b;
  }

  function max256(uint256 a, uint256 b) internal constant returns (uint256) {
    return a >= b ? a : b;
  }

  function min256(uint256 a, uint256 b) internal constant returns (uint256) {
    return a < b ? a : b;
  }

}

contract StandardToken is ERC20, SafeMath {

  /* Token supply got increased and a new owner received these tokens */
  event Minted(address receiver, uint amount);

  /* Actual balances of token holders */
  mapping(address => uint) balances;

  /* approve() allowances */
  mapping (address => mapping (address => uint)) allowed;

  /* Interface declaration */
  function isToken() public constant returns (bool Yes) {
    return true;
  }

  function transfer(address _to, uint _value) returns (bool success) {
    balances[msg.sender] = safeSub(balances[msg.sender], _value);
    balances[_to] = safeAdd(balances[_to], _value);
    Transfer(msg.sender, _to, _value);
    return true;
  }

  function transferFrom(address _from, address _to, uint _value) returns (bool success) {
    uint _allowance = allowed[_from][msg.sender];

    balances[_to] = safeAdd(balances[_to], _value);
    balances[_from] = safeSub(balances[_from], _value);
    allowed[_from][msg.sender] = safeSub(_allowance, _value);
    Transfer(_from, _to, _value);
    return true;
  }

  function balanceOf(address _address) constant returns (uint balance) {
    return balances[_address];
  }

  function approve(address _spender, uint _value) returns (bool success) {

    // To change the approve amount you first have to reduce the addresses`
    //  allowance to zero by calling `approve(_spender, 0)` if it is not
    //  already 0 to mitigate the race condition described here:
    //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
    require((_value == 0) || (allowed[msg.sender][_spender] == 0));

    allowed[msg.sender][_spender] = _value;
    Approval(msg.sender, _spender, _value);
    return true;
  }

  function allowance(address _owner, address _spender) constant returns (uint remaining) {
    return allowed[_owner][_spender];
  }

}

contract SCCToken is StandardToken {

    string public name = "Stealth Crypto";
    string public symbol = "SCC";
    uint public decimals = 16;
    
	// Crowdsale start time and Crowdsale end time
	uint public TimeStart = ;//Presale start time Unix timestamp
	uint public TimeEnd = ;//Presale end time Unix timestamp
	
	// Stages end times
	uint public TimeStageOne = 1512561600;
	uint public TimeStageTwo = 1513166400;
    
	uint public TimeTransferAllowed = ;//Token transfers are blocked for 9 months (270 days = 23328000 seconds) after sale
	
	//Crowdsale pools
	uint public TotalSupply = 0;
	uint public SaleSupply = 1000000000;
	uint public PoolFund = 40000000;//StealthCryptoTM Fund
	uint public PoolMarketing = 4000000;//Marketing effort pool
	uint public PoolBounty = 4000000;//Bounty and contest rewards
	    
	//Token prices
	uint public PriceStageOne = 1000000000000000 wei;
	uint public PriceStageTwo = 1000000000000000 wei;
	uint public PriceManual = 0 wei;//If more than 0 is set, the tokens are sold for this manual price, rather than predefined price.
	
	//Technical variables to store states
    bool public CrowdsalePaused = false; //Whether the Crowdsale is now suspended (true or false)
    bool public CrowdsaleFinished = false; //Whether the Crowdsale has ended (true or false)
	
    //Technical variables to store statistical data
	uint public StatsEthereumRaised = 0 wei;//Переменная сохранит в себе количество собранного Ethereum
	uint public StatsTotalSupply = 0;//Общее количество выпущенных токенов

    //Events
    event Buy(address indexed sender, uint eth, uint fbt);//Tokens purchased
    event TokensSent(address indexed to, uint value);//Tokens sent
    event ContributionReceived(address indexed to, uint value);//Investment received
    event PriceChanged(string _text, uint _tokenPrice);//Manual token price
    event TimeEndChanged(string _text, uint _timeEnd);//Crowdsale end time was changed manually
    event TimeTransferAllowanceChanged(string _text, uint _timeAllowance);//Token transfers block time changed manually
    
    address public owner = 0x0;//Admin actions
    address public wallet = 0x0;//Wallet to receive ETH
 
function SCCToken(address _owner, address _wallet) payable {
        
      owner = _owner;
      wallet = _wallet;
    
      balances[owner] = 200000000;//200,000,000
      balances[wallet] = 0;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

	//Crowdsale paused or started
    modifier isActive() {
        require(!CrowdsalePaused);
        _;
    }

    //Transaction received - run the purchase function
    function() payable {
        buy();
    }
    
    //Manually set the token price (in wei - https://etherconverter.online), and the sale will go at a given cost, and not at a price that depends on the week of the sale. Set the value to 0 to cancel and get back to default.
    function setTokenPrice(uint _tokenPrice) external onlyOwner {
        PriceManual = _tokenPrice;
        PriceChanged("New price is ", _tokenPrice);
    }
    
    //Change the Crowdsale end time, instead of predefined
    function setTimeEnd(uint _timeEnd) external onlyOwner {
        TimeEnd = _timeEnd;
        TimeEndChanged("New Crowdsale End Time is ", _timeEnd);
    }
     
    //Change the time before which token transfers are prohibited
    function setTimeTransferAllowance(uint _timeAllowance) external onlyOwner {
        TimeTransferAllowed = _timeAllowance;
        TimeTransferAllowanceChanged("Token transfers will be allowed at ", _timeAllowance);
    }
    
    //Finish the sale. Run only if necessary to stop and finish the sale. No return back there. Team, bounty and adviser token pools are created depending on the volume of sales, and transferred to the Owner (administrator).
    function finishCrowdsale() external onlyOwner returns (bool) {
        if (CrowdsaleFinished == false) {
            
            Percent = StatsTotalSupply/100000000*100;
            
            PoolFund = StatsTotalSupply*Percent/100;
            PoolMarketing = StatsTotalSupply*Percent/100;
            PoolBounty = StatsTotalSupply*Percent/100;
            
            uint poolTokens = 0;
            poolTokens = safeAdd(poolTokens,PoolFund);
            poolTokens = safeAdd(poolTokens,PoolMarketing);
            poolTokens = safeAdd(poolTokens,PoolBounty);
            
            require(poolTokens>0);
            balances[owner] = safeAdd(balances[owner], poolTokens);
            StatsTotalSupply = safeAdd(StatsTotalSupply, poolTokens);
            Transfer(0, this, poolTokens);
            Transfer(this, owner, poolTokens);
                        
            CrowdsaleFinished = true;
            
            }
        }

    //See the current token price in wei (https://etherconverter.online to convert to other units, such as ETH)
    function price() constant returns (uint) {
        if(PriceManual > 0){return PriceManual;}
        if(now >= TimeStart && now < TimeStageOne){return PriceStageOne;}
        if(now <= TimeWeekTwo){return PriceStageTwo;}
    }
    
    // Create `amount` tokens and send them to` target`
    function sendTokens(address target, uint amount) onlyOwner external {
        require(amount>0);//Number of tokens must be greater than 0
        balances[target] = safeAdd(balances[target], amount);
        StatsTotalSupply = safeAdd(StatsTotalSupply, amount);
        Transfer(0, this, amount);
        Transfer(this, target, amount);
        
        PoolCrowdsale = safeAdd(PoolCrowdsale,amount);
    }

    //The function of buying tokens on Crowdsale
    function buy() public payable returns(bool) {

        require(msg.sender != owner);//The founder cannot buy tokens
        require(msg.sender != wallet);//The wallet address cannot buy tokens
        require(!CrowdsalePaused);//Purchase permitted if Crowdsale is paused
        require(!CrowdsaleFinished);//Purchase permitted if Crowdsale is finished
        require(msg.value >= price());//The amount received in wei must be greater than the cost of 1 token
        require(now >= TimeStart);//Sale condition - Crowdsale started
        require(now <= TimeEnd);//Sale condition - Crowdsale not completed
        uint tokens = msg.value/price();//Number of tokens to be received by the buyer
        
        require(tokens>0);//Number of tokens must be greater than 0
        
        wallet.transfer(msg.value);//Send received ETH to the fundraising purse
        
        //Crediting of tokens to the buyer
        balances[msg.sender] = safeAdd(balances[msg.sender], tokens);
        StatsTotalSupply = safeAdd(StatsTotalSupply, tokens);//Update total number of released tokens
        Transfer(0, this, tokens);
        Transfer(this, msg.sender, tokens);
        
        StatsEthereumRaised = safeAdd(StatsEthereumRaised, msg.value);//Update total ETH collected
        PoolCrowdsale = safeAdd(PoolCrowdsale, tokens);//Update Crowdsale pool size 
        
        //Record event logs to the blockchain
        Buy(msg.sender, msg.value, tokens);
        TokensSent(msg.sender, tokens);
        ContributionReceived(msg.sender, msg.value);

        return true;
    }
    
    function EventEmergencyStop() onlyOwner() {CrowdsalePaused = true;}//Temporarily suspend all sales and transfers of tokens in case of unforeseen circumstances, for an indefinite period
    function EventEmergencyContinue() onlyOwner() {CrowdsalePaused = false;}//Continue the crowdsale, cancel the emergency suspension

    //Forbid token transfers by time function draft
    function transfer(address _to, uint _value) isActive() returns (bool success) {
        
    if(now >= TimeTransferAllowed){
        if(noTransfer[msg.sender]){noTransfer[msg.sender] = false;}//
    }
        
    if(now < TimeTransferAllowed){require(!noTransfer[msg.sender]);}//
        
    return super.transfer(_to, _value);
    }

    //Forbid token transfers by time function draft
    function transferFrom(address _from, address _to, uint _value) isActive() returns (bool success) {
        
    if(now >= TimeTransferAllowed){
        if(noTransfer[msg.sender]){noTransfer[msg.sender] = false;}//
    }
        
    if(now < TimeTransferAllowed){require(!noTransfer[msg.sender]);}//
        
        return super.transferFrom(_from, _to, _value);
    }

    //Change owner
    function changeOwner(address _to) onlyOwner() {
        balances[_to] = balances[owner];
        balances[owner] = 0;
        owner = _to;
    }

    //Change wallet
    function changeWallet(address _to) onlyOwner() {
        balances[_to] = balances[wallet];
        balances[wallet] = 0;
        wallet = _to;
    }
}