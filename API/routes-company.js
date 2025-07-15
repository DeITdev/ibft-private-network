// routes-company.js - Company management routes
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Helper function to load contract (will be injected from app.js)
let loadContract, sendTransaction, web3;

// Initialize route dependencies
function initCompanyRoutes(dependencies) {
  loadContract = dependencies.loadContract;
  sendTransaction = dependencies.sendTransaction;
  web3 = dependencies.web3;
}

// =================================
// COMPANY CONTRACT ROUTES
// =================================

// Companies - List all companies
router.get('/', async (req, res) => {
  try {
    const deployFile = path.join(__dirname, 'contract-deployment-company.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Company contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('company');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const total = await instance.methods.getTotalCompanies().call();
    if (total === '0') {
      return res.json({ success: true, companies: [], total: 0 });
    }

    const ids = await instance.methods.getAllCompanyIds().call();
    const companies = [];

    for (const id of ids) {
      try {
        const company = await instance.methods.getCompany(id).call();
        companies.push({
          recordId: company.recordId,
          createdTimestamp: new Date(parseInt(company.createdTimestamp) * 1000).toISOString(),
          modifiedTimestamp: new Date(parseInt(company.modifiedTimestamp) * 1000).toISOString(),
          modifiedBy: company.modifiedBy,
          allData: JSON.parse(company.allData)
        });
      } catch (err) {
        console.error(`Error loading company ${id}:`, err.message);
      }
    }

    res.json({
      success: true,
      companies,
      total: companies.length,
      contractAddress: deployment.contractAddress,
      metadata: {
        blockchainNetwork: deployment.transactionDetails?.chainId || 'unknown',
        contractType: 'CompanyStorage',
        deploymentTime: deployment.deploymentTime
      }
    });

  } catch (error) {
    console.error('Error fetching companies:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'list_companies'
    });
  }
});

// Companies - Store new company data
router.post('/', async (req, res) => {
  try {
    const { privateKey, companyData } = req.body;

    // Validation
    if (!privateKey) {
      return res.status(400).json({ error: 'privateKey required' });
    }
    if (!companyData?.recordId) {
      return res.status(400).json({ error: 'companyData with recordId required' });
    }

    const deployFile = path.join(__dirname, 'contract-deployment-company.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Company contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('company');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const { recordId, createdTimestamp, modifiedTimestamp, modifiedBy, allData } = companyData;

    // Convert timestamps to Unix format
    const createdUnix = Math.floor(new Date(createdTimestamp).getTime() / 1000);
    const modifiedUnix = Math.floor(new Date(modifiedTimestamp).getTime() / 1000);
    const dataString = typeof allData === 'string' ? allData : JSON.stringify(allData);

    // Encode the transaction
    const data = instance.methods.storeCompany(
      recordId, createdUnix, modifiedUnix, modifiedBy, dataString
    ).encodeABI();

    console.log(`Storing company data: ${recordId}`);
    console.log(`  Company Name: ${allData.company_name || 'N/A'}`);
    console.log(`  Abbreviation: ${allData.abbr || 'N/A'}`);
    console.log(`  Country: ${allData.country || 'N/A'}`);
    console.log(`  Currency: ${allData.default_currency || 'N/A'}`);

    // Send transaction
    const receipt = await sendTransaction(privateKey, deployment.contractAddress, data);
    console.log('Company data stored successfully on blockchain!');

    res.json({
      success: true,
      operation: 'store_company',
      recordId,
      companyInfo: {
        company_name: allData.company_name,
        abbr: allData.abbr,
        country: allData.country,
        default_currency: allData.default_currency,
        email: allData.email,
        phone_no: allData.phone_no
      },
      blockchain: {
        contractAddress: deployment.contractAddress,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Company store failed:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'store_company'
    });
  }
});

// Companies - Get company by ID
router.get('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-company.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Company contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('company');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    // Check if company exists
    const exists = await instance.methods.doesCompanyExist(recordId).call();
    if (!exists) {
      return res.status(404).json({
        error: `Company ${recordId} not found`,
        recordId,
        contractAddress: deployment.contractAddress
      });
    }

    // Get company data
    const company = await instance.methods.getCompany(recordId).call();
    const companyData = JSON.parse(company.allData);

    res.json({
      success: true,
      recordId: company.recordId,
      createdTimestamp: new Date(parseInt(company.createdTimestamp) * 1000).toISOString(),
      modifiedTimestamp: new Date(parseInt(company.modifiedTimestamp) * 1000).toISOString(),
      modifiedBy: company.modifiedBy,
      allData: companyData,
      companyInfo: {
        company_name: companyData.company_name,
        abbr: companyData.abbr,
        country: companyData.country,
        default_currency: companyData.default_currency,
        email: companyData.email,
        phone_no: companyData.phone_no,
        website: companyData.website,
        tax_id: companyData.tax_id
      },
      blockchain: {
        contractAddress: deployment.contractAddress,
        contractType: 'CompanyStorage',
        networkId: deployment.transactionDetails?.chainId
      }
    });

  } catch (error) {
    console.error('Error fetching company:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_company',
      recordId: req.params.recordId
    });
  }
});

// Companies - Get company metadata only (without full data)
router.get('/:recordId/metadata', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-company.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Company contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('company');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    // Check if company exists
    const exists = await instance.methods.doesCompanyExist(recordId).call();
    if (!exists) {
      return res.status(404).json({
        error: `Company ${recordId} not found`,
        recordId,
        contractAddress: deployment.contractAddress
      });
    }

    // Get company metadata
    const metadata = await instance.methods.getCompanyMetadata(recordId).call();

    res.json({
      success: true,
      recordId: metadata.recordId,
      createdTimestamp: new Date(parseInt(metadata.createdTimestamp) * 1000).toISOString(),
      modifiedTimestamp: new Date(parseInt(metadata.modifiedTimestamp) * 1000).toISOString(),
      modifiedBy: metadata.modifiedBy,
      blockchain: {
        contractAddress: deployment.contractAddress,
        contractType: 'CompanyStorage'
      }
    });

  } catch (error) {
    console.error('Error fetching company metadata:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_company_metadata',
      recordId: req.params.recordId
    });
  }
});

// Companies - Get company financial summary
router.get('/:recordId/financial', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-company.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).json({ error: 'Company contract not deployed' });
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('company');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    // Check if company exists
    const exists = await instance.methods.doesCompanyExist(recordId).call();
    if (!exists) {
      return res.status(404).json({
        error: `Company ${recordId} not found`,
        recordId,
        contractAddress: deployment.contractAddress
      });
    }

    // Get company data and extract financial info
    const company = await instance.methods.getCompany(recordId).call();
    const companyData = JSON.parse(company.allData);

    const financialInfo = {
      default_currency: companyData.default_currency,
      monthly_sales_target: companyData.monthly_sales_target,
      total_monthly_sales: companyData.total_monthly_sales,
      credit_limit: companyData.credit_limit,
      round_off_account: companyData.round_off_account,
      default_income_account: companyData.default_income_account,
      default_expense_account: companyData.default_expense_account,
      default_cash_account: companyData.default_cash_account,
      default_bank_account: companyData.default_bank_account,
      cost_center: companyData.cost_center
    };

    res.json({
      success: true,
      recordId: company.recordId,
      financialInfo,
      blockchain: {
        contractAddress: deployment.contractAddress,
        contractType: 'CompanyStorage'
      }
    });

  } catch (error) {
    console.error('Error fetching company financial info:', error.message);
    res.status(500).json({
      error: error.message,
      operation: 'get_company_financial',
      recordId: req.params.recordId
    });
  }
});

// Companies - Check if company exists
router.head('/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;

    const deployFile = path.join(__dirname, 'contract-deployment-company.json');
    if (!fs.existsSync(deployFile)) {
      return res.status(404).end();
    }

    const deployment = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
    const { contract } = loadContract('company');
    const instance = new web3.eth.Contract(contract.abi, deployment.contractAddress);

    const exists = await instance.methods.doesCompanyExist(recordId).call();

    if (exists) {
      res.status(200).end();
    } else {
      res.status(404).end();
    }

  } catch (error) {
    console.error('Error checking company existence:', error.message);
    res.status(500).end();
  }
});

// Export router and initialization function
module.exports = {
  router,
  initCompanyRoutes
};