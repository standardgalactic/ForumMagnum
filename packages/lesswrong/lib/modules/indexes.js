import { Posts } from '../collections/posts';
import { Comments } from '../collections/comments'
import { Votes } from "meteor/vulcan:voting";
import LWEvents from '../collections/lwevents/collection.js'
import Notifications from '../collections/notifications/collection.js'
import Users from "meteor/vulcan:users";


// Recent Comments query index\
Comments._ensureIndex({'postedAt': -1, '_id': -1});

// Top Posts query index
Posts._ensureIndex({'status': -1, 'draft': -1, 'isFuture': -1, 'sticky': -1, 'score': -1, '_id': -1});

// Votes by document (comment) ID
Votes._ensureIndex({ "documentId": 1 });

//
// Indexes from Production
//
// This list was generated by running packages/lesswrong/scripts/printIndexes.js
// on a production database, after that database went through some iterations of
// adding missing indexes based on mLab's missing-index heuristics. Then
// printIndexes.js marks the indexes which weren't used at all in the ~week
// before the script was run, and I deleted those which were both unused in
// practice, and unlikely to be used again in my subjective judgment. (For
// example, I kept "users by Twitter ID", because Twitter OAuth is broken and
// that index will be useful when it's fixed.) Finally, I deleted indexes from
// this list that are definitely manually created elsewhere in the codebase.
//

Comments._ensureIndex({postId:1}, {background:true});
Comments._ensureIndex({inactive:1}, {background:true});
Comments._ensureIndex({postId:1,postedAt:-1,_id:-1}, {background:true});
Comments._ensureIndex({userId:1,postedAt:-1,_id:-1,deleted:1}, {background:true});
Comments._ensureIndex({legacyId:1}, {background:true});
Comments._ensureIndex({postId:1,baseScore:-1,postedAt:-1,_id:-1,deleted:1}, {background:true});
Comments._ensureIndex({postedAt:-1,_id:-1,deleted:1}, {background:true});
Comments._ensureIndex({inactive:1,postedAt:1}, {background:true});

LWEvents._ensureIndex({name:1, documentId:1, userId:1}, {background:true})
LWEvents._ensureIndex({name:1, createdAt:-1, _id:-1}, {background: true})
LWEvents._ensureIndex({documentId:1, name:1, createdAt:-1, _id:-1, deleted:1}, {background:true})

Notifications._ensureIndex({userId:1,createdAt:-1,_id:-1}, {background:true});

Posts._ensureIndex({_id:1,score:1,status:1,draft:1,isFuture:1,sticky:1}, {background:true});
Posts._ensureIndex({status:1,sticky:-1,score:-1,_id:-1,draft:1,isFuture:1}, {background:true});
Posts._ensureIndex({status:1,userId:1,postedAt:-1,_id:-1,draft:1,isFuture:1}, {background:true});
Posts._ensureIndex({isFuture:1}, {background:true});
Posts._ensureIndex({status:1,userId:1,draft:1,isFuture:1}, {background:true});
Posts._ensureIndex({userId:1,createdAt:-1}, {background:true});
Posts._ensureIndex({inactive:1}, {background:true});
Posts._ensureIndex({postedAt:-1,createdAt:-1,url:1}, {background:true});
Posts._ensureIndex({status:1,meta:1,score:-1,_id:-1,draft:1,isFuture:1,unlisted:1}, {background:true});
Posts._ensureIndex({status:1,postedAt:-1,_id:-1,draft:1,isFuture:1,unlisted:1,meta:1}, {background:true});
Posts._ensureIndex({slug:1}, {background:true});
Posts._ensureIndex({inactive:1,postedAt:1}, {background:true});
Posts._ensureIndex({status:1,sticky:-1,curatedDate:-1,postedAt:-1,_id:-1,draft:1,isFuture:1,unlisted:1,meta:1}, {background:true});
Posts._ensureIndex({mongoLocation:"2dsphere"}, {"2dsphereIndexVersion":3});
Posts._ensureIndex({status:1,groupId:1,sticky:-1,createdAt:-1,draft:1,isFuture:1,unlisted:1,meta:1}, {background:true});
Posts._ensureIndex({status:1,groupId:1,isEvent:1,draft:1,isFuture:1,unlisted:1,meta:1,startTime:1}, {background:true});
Posts._ensureIndex({createdAt:-1});
Posts._ensureIndex({legacyId:1}, {background:true});

Posts._ensureIndex({status:1,lastCommentedAt:-1,_id:-1,draft:1,isFuture:1,unlisted:1,commentCount:1,baseScore:1,hideFrontpageComments:1}, {background:true, name:"posts_complexSort_1"});
Posts._ensureIndex({status:1,createdAt:-1,_id:-1,draft:1,isFuture:1,unlisted:1,meta:1,maxBaseScore:1}, {background:true, name:"posts_complexSort_2"});
Posts._ensureIndex({status:1,createdAt:1,draft:1,isFuture:1,unlisted:1,meta:1,groupId:1,isEvent:1,suggestForCuratedUserIds:1,reviewForCuratedUserId:1}, {background:true, name:"posts_complexSort_3"});

Users._ensureIndex({username:1}, {unique:true,sparse:1});
Users._ensureIndex({"emails.address":1}, {unique:true,sparse:1});
Users._ensureIndex({"services.resume.loginTokens.hashedToken":1}, {unique:true,sparse:1});
Users._ensureIndex({"services.resume.loginTokens.token":1}, {unique:true,sparse:1});
Users._ensureIndex({"services.resume.haveLoginTokensToDelete":1}, {sparse:1});
Users._ensureIndex({"services.resume.loginTokens.when":1}, {sparse:1});
Users._ensureIndex({"services.email.verificationTokens.token":1}, {unique:true,sparse:1});
Users._ensureIndex({"services.password.reset.token":1}, {unique:true,sparse:1});
Users._ensureIndex({"services.password.reset.when":1}, {sparse:1});
Users._ensureIndex({"services.twitter.id":1}, {unique:true,sparse:1});
Users._ensureIndex({"services.facebook.id":1}, {unique:true,sparse:1});
Users._ensureIndex({"services.google.id":1}, {unique:true,sparse:1});
Users._ensureIndex({karma:-1,_id:-1}, {background:true});
Users._ensureIndex({slug:1}, {background:true});
Users._ensureIndex({isAdmin:1}, {background:true});
Users._ensureIndex({"services.github.id":1}, {unique:true,sparse:1});
Users._ensureIndex({createdAt:-1,_id:-1}, {background:true});

Votes._ensureIndex({userId:1,documentId:1}, {background:true});
