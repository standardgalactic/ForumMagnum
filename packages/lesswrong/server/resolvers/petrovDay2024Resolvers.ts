import { PetrovDayLaunchs } from "@/lib/collections/petrovDayLaunchs";
import { addGraphQLMutation, addGraphQLQuery, addGraphQLResolvers, addGraphQLSchema } from "../vulcan-lib";
import { petrovDayLaunchCode } from "@/components/seasonal/PetrovDayButton";
import PetrovDayActions from "@/lib/collections/petrovDayActions/collection";
import { petrovBeforeTime } from "@/components/Layout";
import { DatabaseServerSetting } from "../databaseSettings";
import sample from "lodash/sample";
import { inWarningWindow } from "@/components/seasonal/petrovDay/PetrovWarningConsole";
import { defineQuery } from "../utils/serverGraphqlUtil";

const petrovFalseAlarmMissileCount = new DatabaseServerSetting<number[]>('petrovFalseAlarmMissileCount', [])
const petrovRealAttackMissileCount = new DatabaseServerSetting<number[]>('petrovRealAttackMissileCount', [])

const getIncomingCount = (incoming: boolean, role: 'eastPetrov' | 'westPetrov') => {
  const currentHour = new Date().getHours();
  const roleSeed = role === 'eastPetrov' ? 0 : 13;
  const seed = currentHour + roleSeed + (incoming ? 17 : 0); // Different seed for each hour, role, and incoming state

  const missileCountArray = incoming ? petrovRealAttackMissileCount.get() : petrovFalseAlarmMissileCount.get();

  const result = seed % missileCountArray.length
  console.log({currentHour, roleSeed, incoming, seed, result})
  return missileCountArray[result];
}

const PetrovDay2024CheckNumberOfIncomingData = `type PetrovDay2024CheckNumberOfIncomingData {
  count: Int
}`

addGraphQLSchema(PetrovDay2024CheckNumberOfIncomingData);
const startTime = new Date(petrovBeforeTime.get())

const petrovDay2024Resolvers = {
  Query: {
    async PetrovDay2024CheckNumberOfIncoming(root: void, args: void, context: ResolverContext) {
      const actions = await PetrovDayActions.find({createdAt: {$gte: startTime}, actionType: {$ne: 'optIn'}}, {limit: 100}).fetch()

      if (!inWarningWindow(new Date().getMinutes()) || !context.currentUser) {
        return { count: 0 }
      }

      const userRole = actions.filter(action => action.actionType === 'hasRole' && action.userId === context.currentUser?._id)?.[0]?.data?.role

      if (userRole === 'eastPetrov') {  
        const nukeTheEastActions = actions.filter(action => action.actionType === 'nukeTheEast')
        const incoming = !!(nukeTheEastActions?.length > 0)
        return { count: getIncomingCount(incoming, 'eastPetrov') }
      }
      if (userRole === 'westPetrov') {
        const nukeTheWestActions = actions.filter(action => action.actionType === 'nukeTheWest')
        const incoming = !!(nukeTheWestActions?.length > 0)
        return { count: getIncomingCount(incoming, 'westPetrov') }
      }
      return { count: 0 }
    }
  },
};

addGraphQLResolvers(petrovDay2024Resolvers);

addGraphQLQuery('PetrovDay2024CheckNumberOfIncoming: PetrovDay2024CheckNumberOfIncomingData');




defineQuery({
  name: "petrov2024checkIfNuked",
  resultType: "Boolean",
  fn: async (_, { }, context: ResolverContext): Promise<Boolean> => {
    if (!context.currentUser) return false
    const actions = await PetrovDayActions.find({}).fetch()
    const userSide = actions.find(({actionType, userId}) => userId === context.currentUser?._id && actionType === 'hasSide')?.data.side
    
    const ninetyMinutesAgo = new Date(new Date().getTime() - (90 * 60 * 1000))

    if (userSide === 'east') {
      const eastIsNuked = actions.find(({actionType, createdAt}) => actionType === 'nukeTheEast' && createdAt > ninetyMinutesAgo)
      return !!eastIsNuked
    }
    if (userSide === 'west') {
      const westIsNuked = actions.find(({actionType, createdAt}) => actionType === 'nukeTheWest' && createdAt > ninetyMinutesAgo)
      return !!westIsNuked
    }
    return false
  }
})
