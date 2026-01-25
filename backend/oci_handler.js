const common = require('oci-common');
const aiSpeech = require('oci-aispeech');
const aiLanguage = require('oci-ailanguage');
const objectstorage = require('oci-objectstorage');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const COMPARTMENT_ID = process.env.OCI_COMPARTMENT_ID || 'ocid1.compartment.oc1..aaaaaaaalvzoolk2i3sunaz33fcgppqrvzxmgdzdsffvzhbz2uxjdyhayilq';
const BUCKET_NAME = process.env.OCI_BUCKET_NAME || 'creole-audio-bucket';
const NAMESPACE = process.env.OCI_NAMESPACE || null;

// Note: OCI Speech does not natively support Haitian Creole (ht-HT)
// This implementation uses French as the closest supported language
const SUPPORTED_LANGUAGES = {
  'ht': 'fr-FR', // French as fallback for Haitian Creole
  'fr': 'fr-FR',
  'en': 'en-US'
};

async function processAudio(audioPath) {
  let provider;
  let speechClient;
  let languageClient;
  let objectStorageClient;
  let objectName;
  
  try {
    // Load OCI configuration
    const configPath = path.join(process.env.HOME, '.oci', 'config');
    provider = new common.ConfigFileAuthenticationDetailsProvider(configPath);
    
    console.log('OCI: Initializing clients...');
    
    // Initialize OCI clients
    speechClient = new aiSpeech.AIServiceSpeechClient({ 
      authenticationDetailsProvider: provider 
    });
    
    languageClient = new aiLanguage.AIServiceLanguageClient({
      authenticationDetailsProvider: provider
    });
    
    objectStorageClient = new objectstorage.ObjectStorageClient({
      authenticationDetailsProvider: provider
    });
    
    // Get namespace if not provided
    let namespace = NAMESPACE;
    if (!namespace) {
      console.log('OCI: Getting namespace...');
      const namespaceResponse = await objectStorageClient.getNamespace({});
      namespace = namespaceResponse.value;
    }
    
    // Ensure bucket exists
    await ensureBucket(objectStorageClient, namespace, BUCKET_NAME);
    
    // Read and upload audio file to Object Storage
    console.log('OCI: Uploading audio to Object Storage...');
    const audioBytes = await fs.readFile(audioPath);
    objectName = `audio-${Date.now()}-${path.basename(audioPath)}`;
    
    await objectStorageClient.putObject({
      namespaceName: namespace,
      bucketName: BUCKET_NAME,
      objectName: objectName,
      putObjectBody: audioBytes
    });
    
    console.log('OCI: Creating transcription job...');
    
    // Create transcription job
    // Note: Using French as OCI doesn't support Haitian Creole
    const createTranscriptionJobDetails = {
      compartmentId: COMPARTMENT_ID,
      displayName: `Creole-Translation-${Date.now()}`,
      inputLocation: {
        locationType: 'OBJECT_LIST_INLINE_INPUT_LOCATION',
        objectLocations: [{
          namespaceName: namespace,
          bucketName: BUCKET_NAME,
          objectNames: [objectName]
        }]
      },
      outputLocation: {
        namespaceName: namespace,
        bucketName: BUCKET_NAME,
        prefix: `output-${Date.now()}`
      },
      modelDetails: {
        domain: 'GENERIC',
        languageCode: 'fr-FR' // Using French as fallback
      }
    };
    
    const createJobRequest = {
      createTranscriptionJobDetails: createTranscriptionJobDetails
    };
    
    const transcriptionJobResponse = await speechClient.createTranscriptionJob(createJobRequest);
    const jobId = transcriptionJobResponse.transcriptionJob.id;
    
    console.log('OCI: Waiting for transcription to complete...');
    
    // Poll for completion
    const transcription = await waitForTranscription(speechClient, objectStorageClient, namespace, jobId);
    
    if (!transcription) {
      throw new Error('No transcription generated');
    }
    
    console.log('OCI: Transcription:', transcription);
    
    // Translate to English using OCI AI Language
    console.log('OCI: Translating to English...');
    
    const batchLanguageTranslationDetails = {
      compartmentId: COMPARTMENT_ID,
      targetLanguageCode: 'en',
      documents: [{
        key: 'doc1',
        text: transcription,
        languageCode: 'fr' // Source is French
      }]
    };
    
    const translationRequest = {
      batchLanguageTranslationDetails: batchLanguageTranslationDetails
    };
    
    const translationResponse = await languageClient.batchLanguageTranslation(translationRequest);
    const translation = translationResponse.batchLanguageTranslationResult.documents[0].translatedText;
    
    // Clean up uploaded audio file
    console.log('OCI: Cleaning up...');
    await objectStorageClient.deleteObject({
      namespaceName: namespace,
      bucketName: BUCKET_NAME,
      objectName: objectName
    }).catch(err => console.error('Error deleting object:', err));
    
    return {
      provider: 'oci',
      transcription: transcription,
      translation: translation,
      language: 'Haitian Creole (processed as French)',
      note: 'OCI Speech does not natively support Haitian Creole; French was used as the closest available language.'
    };
    
  } catch (error) {
    console.error('OCI processing error:', error);
    
    // Clean up on error
    if (objectStorageClient && objectName && NAMESPACE) {
      try {
        await objectStorageClient.deleteObject({
          namespaceName: NAMESPACE,
          bucketName: BUCKET_NAME,
          objectName: objectName
        });
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
    }
    
    throw new Error(`OCI processing failed: ${error.message}`);
  }
}

async function ensureBucket(client, namespace, bucketName) {
  try {
    await client.getBucket({
      namespaceName: namespace,
      bucketName: bucketName
    });
    console.log('OCI: Bucket exists');
  } catch (error) {
    if (error.statusCode === 404) {
      console.log('OCI: Creating bucket...');
      await client.createBucket({
        namespaceName: namespace,
        createBucketDetails: {
          compartmentId: COMPARTMENT_ID,
          name: bucketName,
          publicAccessType: 'NoPublicAccess'
        }
      });
    } else {
      throw error;
    }
  }
}

async function waitForTranscription(speechClient, objectStorageClient, namespace, jobId, maxWaitTimeSeconds = 300) {
  const startTime = Date.now();
  const pollInterval = 5000; // 5 seconds
  
  while (true) {
    const getJobRequest = { transcriptionJobId: jobId };
    const jobResponse = await speechClient.getTranscriptionJob(getJobRequest);
    const job = jobResponse.transcriptionJob;
    
    console.log('OCI: Job status:', job.lifecycleState);
    
    if (job.lifecycleState === 'SUCCEEDED') {
      // Extract transcription text from the output location in Object Storage
      if (job.outputLocation && job.outputLocation.prefix) {
        console.log('OCI: Fetching transcription output from Object Storage...');
        return await fetchTranscriptionOutput(
          objectStorageClient, 
          namespace, 
          job.outputLocation.bucketName,
          job.outputLocation.prefix
        );
      }
      
      return 'Transcription completed but output location not available';
    }
    
    if (job.lifecycleState === 'FAILED') {
      throw new Error(`Transcription job failed: ${job.lifecycleDetails || 'Unknown error'}`);
    }
    
    // Check timeout
    if (Date.now() - startTime > maxWaitTimeSeconds * 1000) {
      throw new Error('Transcription timeout');
    }
    
    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

async function fetchTranscriptionOutput(objectStorageClient, namespace, bucketName, prefix) {
  try {
    // List objects in the output location
    const listObjectsResponse = await objectStorageClient.listObjects({
      namespaceName: namespace,
      bucketName: bucketName,
      prefix: prefix
    });
    
    const objects = listObjectsResponse.listObjects.objects;
    
    if (!objects || objects.length === 0) {
      throw new Error('No output files found');
    }
    
    // Find the JSON result file (typically ends with .json)
    const jsonFile = objects.find(obj => obj.name.endsWith('.json'));
    
    if (!jsonFile) {
      throw new Error('No JSON output file found');
    }
    
    console.log('OCI: Reading transcription result:', jsonFile.name);
    
    // Fetch the JSON file
    const getObjectResponse = await objectStorageClient.getObject({
      namespaceName: namespace,
      bucketName: bucketName,
      objectName: jsonFile.name
    });
    
    // Read the stream and parse JSON
    const chunks = [];
    for await (const chunk of getObjectResponse.value) {
      chunks.push(chunk);
    }
    const jsonContent = Buffer.concat(chunks).toString('utf-8');
    const result = JSON.parse(jsonContent);
    
    // Extract transcription text from the result
    // OCI Speech output format: { "transcriptions": [{ "transcription": "text" }] }
    if (result.transcriptions && result.transcriptions.length > 0) {
      const transcription = result.transcriptions
        .map(t => t.transcription)
        .filter(t => t)
        .join(' ');
      
      return transcription || 'No transcription text found in output';
    }
    
    return 'Unable to parse transcription from output';
    
  } catch (error) {
    console.error('Error fetching transcription output:', error);
    throw new Error(`Failed to fetch transcription output: ${error.message}`);
  }
}

module.exports = { processAudio };
