const { getNamedAccounts, ethers } = require("hardhat")

const AMOUNT = ethers.utils.parseEther("0.03")

async function getWeth() {
  const { deployer } = await getNamedAccounts()
  // Call "deposit" function on the WETH contract
  // We need ABI and Contract address
  // "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
  const iWeth = await ethers.getContractAt(
    "IWeth",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    deployer
  )

  const tx = await iWeth.deposit({ value: AMOUNT })
  await tx.wait(1)
  const wethBalance = await iWeth.balanceOf(deployer)
  console.log(`You have ${wethBalance.toString()} WETH`)
}

module.exports = { getWeth, AMOUNT }
