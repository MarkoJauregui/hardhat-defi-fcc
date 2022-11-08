const { getNamedAccounts, ethers } = require("hardhat")
const { getWeth, AMOUNT } = require("../scripts/getWeth")

async function main() {
  // Aave treats everything as a ERC20 token, so we cant' use normal ETH, we need to Wrap it in WETH.
  await getWeth()
  const { deployer } = await getNamedAccounts()
  // Abi, address
  // LendingPoolAddressProvider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
  // Lending Pool: ^
  const lendingPool = await getLendingPool(deployer)
  console.log(`Lending Pool address: ${lendingPool.address}`)

  // Deposit
  const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  // Approve
  await approveERC20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
  console.log("Depositing...")
  await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
  console.log("Deposited!")
  console.log("------------------------------------------------")

  let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer)

  // Borrowing -> Amount borrowed, collateral amount, how much can you borrow.
  // How much DAI can you borrow with the avaialbleBorrowsETH? -> Get DAI conversion rate
  const daiPrice = await getDaiPrice()
  const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
  const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString())

  const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)
  await getBorrowUserData(lendingPool, deployer)

  // Repaying to user
  await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer)
  await getBorrowUserData(lendingPool, deployer)
}

async function getLendingPool(account) {
  const lendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  )
  // Get lendingPool Address
  const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
  const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)

  return lendingPool
}

async function approveERC20(erc20Address, spenderAddress, amountToSpend, account) {
  const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
  const tx = await erc20Token.approve(spenderAddress, amountToSpend)
  await tx.wait(1)
  console.log("Token Approved!")
}

async function getBorrowUserData(lendingPool, account) {
  const {
    totalCollateralETH,
    totalDebtETH,
    availableBorrowsETH
  } = await lendingPool.getUserAccountData(account)
  console.log(`You have ${totalCollateralETH} worth of ETH deposited`)
  console.log(`You have ${totalDebtETH} worth of ETH borrowed`)
  console.log(`You can borrow ${availableBorrowsETH} worth of ETH`)

  return { availableBorrowsETH, totalDebtETH }
}

async function getDaiPrice() {
  const daiPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4" // No need for signer since we are only viewing
  )
  const price = (await daiPriceFeed.latestRoundData())[1]
  console.log(`The DAI/ETH price is ${price.toString()}`)
  return price
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
  const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)

  await borrowTx.wait(1)

  console.log("You've borrowed!")
  console.log("------------------------------------------------")
}

async function repay(amount, daiAddress, lendingPool, account) {
  await approveERC20(daiAddress, lendingPool.address, amount, account)
  const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
  await repayTx.wait(1)

  console.log("Repaid!")
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.log(error)
    process.exit(1)
  })
